import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, Check, Plus, Clock, Trash2 } from 'lucide-react'
import { DEFAULT_SETS, DEFAULT_REPS, isTimed } from '../lib/program'
import { sessionExercisesToRows } from '../lib/sessionSets'
import { createSession, finishSession, abandonSession, upsertSets, checkAndSavePR, addCustomExercise, addExerciseToWorkoutDay } from '../lib/supabase'
import ExercisePickerModal from './ExercisePickerModal'

function buildSessionExercises(dayExercises, lastSession) {
  return dayExercises.map(wde => {
    const ex = wde.exercises || {}
    const name = ex.name || 'Unknown'
    const targetSets = wde.target_sets || DEFAULT_SETS[name] || 3
    const targetReps = wde.target_reps || DEFAULT_REPS[name] || '—'

    const lastSets = lastSession?.session_sets?.filter(s => s.exercise_id === ex.id) || []
    const lastBest = lastSets.length
      ? lastSets.reduce((a, b) => (Number(a.weight_kg) || 0) >= (Number(b.weight_kg) || 0) ? a : b)
      : null

    return {
      exerciseId: ex.id,
      exerciseName: name,
      altName: ex.alt_name,
      altUsed: false,
      targetSets,
      targetReps,
      lastBest,
      sets: Array.from({ length: targetSets }, (_, i) => ({
        setNumber: i + 1,
        weight: lastBest?.weight_kg ? String(lastBest.weight_kg) : '',
        reps: lastBest?.reps ? String(lastBest.reps) : '',
        done: false,
      })),
    }
  })
}

function mergeSessionExercises(prev, dayExercises, lastSession) {
  const fromPlan = buildSessionExercises(dayExercises, lastSession)
  const merged = []
  const seen = new Set()

  for (const planEx of fromPlan) {
    const existing = prev.find(p => p.exerciseId === planEx.exerciseId)
    merged.push(existing || planEx)
    seen.add(planEx.exerciseId)
  }

  for (const ex of prev) {
    if (ex.exerciseId && !seen.has(ex.exerciseId)) {
      merged.push(ex)
      seen.add(ex.exerciseId)
    }
  }

  return merged
}

export default function ActiveSession({ workoutDay, dayExercises, exercises, sessions, muscleGroups, onBack, onFinished, onExerciseAdded, onPlanChanged }) {
  const color = workoutDay.color
  const startRef = useRef(Date.now())
  const sessionIdRef = useRef(null)
  const pendingSaveRef = useRef(null)
  const saveTimerRef = useRef(null)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const lastSession = sessions
    .filter(s => s.workout_day_id === workoutDay.id && s.finished_at)
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0] || null

  const [sessionExercises, setSessionExercises] = useState(() =>
    buildSessionExercises(dayExercises, lastSession)
  )
  const [restTimer, setRestTimer] = useState(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('idle')

  const persistSession = useCallback(async (exerciseList) => {
    if (!sessionIdRef.current) {
      pendingSaveRef.current = exerciseList
      return
    }
    setSaveStatus('saving')
    try {
      await upsertSets(sessionIdRef.current, sessionExercisesToRows(exerciseList))
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      console.error('Could not save set:', err)
    }
  }, [])

  const scheduleSave = useCallback((exerciseList, immediate = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (immediate) {
      persistSession(exerciseList)
      return
    }
    saveTimerRef.current = setTimeout(() => persistSession(exerciseList), 400)
  }, [persistSession])

  useEffect(() => {
    const last = sessionsRef.current
      .filter(s => s.workout_day_id === workoutDay.id && s.finished_at)
      .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0] || null
    setSessionExercises(prev => mergeSessionExercises(prev, dayExercises, last))
  }, [workoutDay.id, dayExercises])

  useEffect(() => {
    createSession(workoutDay.id).then(s => {
      sessionIdRef.current = s.id
      if (pendingSaveRef.current) {
        persistSession(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
    })
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [workoutDay.id, persistSession])

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return
    const t = setTimeout(() => setRestTimer(r => r - 1), 1000)
    return () => clearTimeout(t)
  }, [restTimer])

  const updateSet = (exIdx, setIdx, field, value) => {
    setSessionExercises(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next)
      return next
    })
  }

  const toggleDone = (exIdx, setIdx) => {
    const wasUndone = !sessionExercises[exIdx].sets[setIdx].done
    setSessionExercises(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next, true)
      return next
    })
    if (wasUndone) setRestTimer(60)
  }

  const addSet = (exIdx) => {
    setSessionExercises(prev => {
      const next = [...prev]
      const sets = next[exIdx].sets
      next[exIdx] = { ...next[exIdx], sets: [...sets, { setNumber: sets.length + 1, weight: '', reps: '', done: false }] }
      scheduleSave(next, true)
      return next
    })
  }

  const toggleAlt = (exIdx) => {
    setSessionExercises(prev => {
      const next = [...prev]
      next[exIdx] = { ...next[exIdx], altUsed: !next[exIdx].altUsed }
      return next
    })
  }

  const appendExercise = (exerciseId, exerciseName, altName, numSets, targetReps) => {
    setSessionExercises(prev => {
      const next = [
        ...prev,
        {
          exerciseId,
          exerciseName,
          altName,
          altUsed: false,
          targetSets: numSets,
          targetReps,
          lastBest: null,
          sets: Array.from({ length: numSets }, (_, i) => ({ setNumber: i + 1, weight: '', reps: '', done: false })),
        },
      ]
      scheduleSave(next, true)
      return next
    })
  }

  const addToPlan = async (exerciseId, targetSets, targetReps) => {
    try {
      await addExerciseToWorkoutDay(workoutDay.id, exerciseId, { targetSets, targetReps })
      await onPlanChanged?.()
    } catch (err) {
      if (err.code !== '23505' && !err.message?.includes('unique')) {
        alert('Could not add to plan: ' + err.message)
      }
    }
  }

  const handleSelectExisting = async (ex, { sets: numSets, targetReps }) => {
    await addToPlan(ex.id, numSets, targetReps)
    appendExercise(ex.id, ex.name, ex.alt_name, numSets, targetReps)
    setShowAddExercise(false)
  }

  const handleCreateNew = async ({ name, altName, muscleGroupId, sets: numSets }) => {
    const saved = await addCustomExercise({
      name,
      altName,
      muscleGroupIds: muscleGroupId ? [muscleGroupId] : [],
    })
    await addToPlan(saved.id, numSets, '8–12')
    await onExerciseAdded?.()
    appendExercise(saved.id, saved.name, saved.alt_name, numSets, '8–12')
    setShowAddExercise(false)
  }

  const removeExercise = (exIdx) => {
    const ex = sessionExercises[exIdx]
    const hasLogged = ex.sets.some(s => s.done || s.weight || s.reps)
    if (hasLogged && !window.confirm(`Remove ${ex.exerciseName} from today's session?`)) return
    setSessionExercises(prev => {
      const next = prev.filter((_, i) => i !== exIdx)
      scheduleSave(next, true)
      return next
    })
  }

  const sessionExerciseIds = sessionExercises.map(ex => ex.exerciseId).filter(Boolean)

  const handleBack = async () => {
    if (sessionIdRef.current) {
      try {
        await abandonSession(sessionIdRef.current)
      } catch {
        // Non-blocking
      }
    }
    onBack()
  }

  const handleFinish = async () => {
    if (!sessionIdRef.current || saving) return
    setSaving(true)
    try {
      const durationMins = Math.max(1, Math.round((Date.now() - startRef.current) / 60000))

      const allSets = sessionExercisesToRows(sessionExercises)

      await upsertSets(sessionIdRef.current, allSets)

      const prs = []
      for (const ex of sessionExercises) {
        if (!ex.exerciseId) continue
        const doneSets = ex.sets.filter(s => s.done && s.weight)
        if (!doneSets.length) continue
        const best = doneSets.reduce((a, b) => Number(a.weight) > Number(b.weight) ? a : b)
        const timed = isTimed(ex.targetReps)
        const pr = await checkAndSavePR(
          sessionIdRef.current,
          ex.exerciseId,
          ex.exerciseName,
          timed ? null : best.weight,
          timed ? null : best.reps,
          timed ? best.weight : null
        )
        if (pr) prs.push(pr)
      }

      const finished = await finishSession(sessionIdRef.current, { durationMins, note: '' })
      onFinished({ ...finished, workout_days: workoutDay, session_sets: allSets, prs })
    } catch (err) {
      alert('Error saving session: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const doneCount = sessionExercises.reduce((a, ex) => a + ex.sets.filter(s => s.done).length, 0)
  const totalSets = sessionExercises.reduce((a, ex) => a + ex.sets.length, 0)

  if (!dayExercises.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>No exercises on this day</p>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Go back and use the gear icon to add exercises to {workoutDay.name}.</p>
        <button onClick={handleBack} style={{ background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>Go Back</button>
      </div>
    )
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh' }}>
      <div style={{ background: color, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={handleBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{workoutDay.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {doneCount}/{totalSets} sets logged
            {saveStatus === 'saving' && ' · Saving…'}
            {saveStatus === 'saved' && ' · Saved'}
            {saveStatus === 'error' && ' · Save failed'}
          </div>
        </div>
      </div>

      {restTimer !== null && restTimer > 0 && (
        <div style={{ background: '#0F172A', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Clock size={15} color="#94A3B8" />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Rest {restTimer}s</span>
          <button onClick={() => setRestTimer(null)} style={{ background: '#1E293B', border: 'none', color: '#94A3B8', borderRadius: 20, padding: '2px 10px', fontSize: 11, cursor: 'pointer' }}>Skip</button>
        </div>
      )}

      <div style={{ padding: '12px 16px 120px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sessionExercises.map((ex, exIdx) => {
            const displayName = ex.altUsed && ex.altName ? ex.altName : ex.exerciseName
            const timed = isTimed(ex.targetReps)
            return (
              <div key={exIdx} style={{ background: '#fff', borderRadius: 14, padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0F172A', flex: 1 }}>{displayName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {ex.altName && (
                      <button onClick={() => toggleAlt(exIdx)} style={{ fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 20, border: 'none', cursor: 'pointer', background: ex.altUsed ? color : '#F1F5F9', color: ex.altUsed ? '#fff' : '#64748B' }}>
                        ⇄ Alt
                      </button>
                    )}
                    <button
                      onClick={() => removeExercise(exIdx)}
                      title="Skip today"
                      style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 10 }}>
                  Target: {ex.targetSets}×{ex.targetReps}
                  {ex.lastBest && ` · Last: ${ex.lastBest.weight_kg ? `${ex.lastBest.weight_kg}kg × ${ex.lastBest.reps}` : `${ex.lastBest.reps}`}`}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 36px', gap: 6, fontSize: 10, color: '#CBD5E1', fontWeight: 700, padding: '0 2px', marginBottom: 4 }}>
                  <div>SET</div>
                  <div>{timed ? 'SECS' : 'KG'}</div>
                  <div>{timed ? '—' : 'REPS'}</div>
                  <div />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ex.sets.map((set, setIdx) => (
                    <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 36px', gap: 6, alignItems: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>{set.setNumber}</div>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={timed ? 'secs' : ex.lastBest?.weight_kg || '0'}
                        value={set.weight}
                        onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                        style={{ padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : '#fff', outline: 'none' }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={timed ? '—' : ex.lastBest?.reps || '0'}
                        value={set.reps}
                        onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                        disabled={timed}
                        style={{ padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : timed ? '#F8FAFC' : '#fff', outline: 'none', opacity: timed ? 0.4 : 1 }}
                      />
                      <button onClick={() => toggleDone(exIdx, setIdx)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: set.done ? '#10B981' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                        <Check size={16} color={set.done ? '#fff' : '#CBD5E1'} strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addSet(exIdx)} style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Add Set
                </button>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setShowAddExercise(true)}
          style={{ width: '100%', marginTop: 16, background: '#fff', border: `1.5px dashed ${color}`, borderRadius: 12, padding: '14px', fontSize: 13, fontWeight: 700, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> Add Exercise
        </button>

        <button
          onClick={handleFinish}
          disabled={saving}
          style={{ width: '100%', marginTop: 12, background: saving ? '#94A3B8' : '#0F172A', color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, cursor: saving ? 'default' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Finish Session'}
        </button>
      </div>

      {showAddExercise && (
        <ExercisePickerModal
          title="Add to Session"
          color={color}
          exercises={exercises}
          muscleGroups={muscleGroups}
          excludeExerciseIds={sessionExerciseIds}
          onClose={() => setShowAddExercise(false)}
          onSelectExisting={handleSelectExisting}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  )
}
