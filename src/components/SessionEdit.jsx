import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, Check, Trash2 } from 'lucide-react'
import { DEFAULT_REPS, isTimed } from '../lib/program'
import { editExercisesToRows } from '../lib/sessionSets'
import { upsertSets } from '../lib/supabase'

function buildEditableExercises(sessionSets) {
  const byExercise = new Map()
  const sorted = [...(sessionSets || [])].sort((a, b) => {
    if (a.exercise_name !== b.exercise_name) return a.exercise_name.localeCompare(b.exercise_name)
    return a.set_number - b.set_number
  })

  sorted.forEach(s => {
    const key = s.exercise_id || s.exercise_name
    if (!byExercise.has(key)) {
      byExercise.set(key, {
        exerciseId: s.exercise_id,
        exerciseName: s.exercise_name,
        altUsed: s.alt_used,
        targetReps: DEFAULT_REPS[s.exercise_name] || '',
        sets: [],
      })
    }
    const timed = s.duration_secs != null && s.weight_kg == null
    byExercise.get(key).sets.push({
      setNumber: s.set_number,
      weight: timed
        ? (s.duration_secs != null ? String(s.duration_secs) : '')
        : (s.weight_kg != null ? String(s.weight_kg) : ''),
      reps: timed ? '' : (s.reps != null ? String(s.reps) : ''),
      done: s.done,
    })
  })

  return [...byExercise.values()]
}

export default function SessionEdit({ session, onBack, onSaved }) {
  const day = session.workout_days
  const color = day?.color || '#2563EB'

  const [exercises, setExercises] = useState(() => buildEditableExercises(session.session_sets))
  const [saveStatus, setSaveStatus] = useState('idle')
  const saveTimerRef = useRef(null)

  const sessionDate = useMemo(() => {
    return new Date(session.started_at).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [session.started_at])

  const persistSession = useCallback(async (exerciseList) => {
    setSaveStatus('saving')
    try {
      await upsertSets(session.id, editExercisesToRows(exerciseList))
      await onSaved?.()
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      alert('Could not save: ' + err.message)
    }
  }, [session.id, onSaved])

  const scheduleSave = useCallback((exerciseList, immediate = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (immediate) {
      persistSession(exerciseList)
      return
    }
    saveTimerRef.current = setTimeout(() => persistSession(exerciseList), 400)
  }, [persistSession])

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
  }, [])

  const updateSet = (exIdx, setIdx, field, value) => {
    setExercises(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next)
      return next
    })
  }

  const toggleDone = (exIdx, setIdx) => {
    setExercises(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next, true)
      return next
    })
  }

  const removeExercise = (exIdx) => {
    const ex = exercises[exIdx]
    if (!window.confirm(`Remove ${ex.exerciseName} from this session?`)) return
    setExercises(prev => {
      const next = prev.filter((_, i) => i !== exIdx)
      scheduleSave(next, true)
      return next
    })
  }

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ background: color, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{day?.name || 'Workout'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
            {sessionDate}
            {saveStatus === 'saving' && ' · Saving…'}
            {saveStatus === 'saved' && ' · Saved'}
            {saveStatus === 'error' && ' · Save failed'}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: 32 }}>No exercises logged in this session.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {exercises.map((ex, exIdx) => {
              const timed = isTimed(ex.targetReps)
              return (
                <div key={exIdx} style={{ background: '#fff', borderRadius: 14, padding: '14px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{ex.exerciseName}</div>
                    <button
                      onClick={() => removeExercise(exIdx)}
                      title="Remove from session"
                      style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
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
                          value={set.weight}
                          onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          style={{ padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : '#fff', outline: 'none' }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                          disabled={timed}
                          style={{ padding: '9px 6px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : timed ? '#F8FAFC' : '#fff', outline: 'none', opacity: timed ? 0.4 : 1 }}
                        />
                        <button onClick={() => toggleDone(exIdx, setIdx)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: set.done ? '#10B981' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={16} color={set.done ? '#fff' : '#CBD5E1'} strokeWidth={3} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
