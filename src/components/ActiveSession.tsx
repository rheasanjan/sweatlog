import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, Check, Plus, Clock, Trash2 } from 'lucide-react'
import { DEFAULT_SETS, DEFAULT_REPS, isTimed, toDateInputValue, dateAtNoon, getPreviousWeekSession, bestSetForExercise, formatBestSetLabel, setRepeatCount } from '../lib/program'
import { sessionExercisesToRows, countLoggedSets, emptySet } from '../lib/sessionSets'
import { createSession, finishSession, abandonSession, upsertSets, checkAndSavePR, addCustomExercise, addExerciseToWorkoutDay, updateSession } from '../lib/supabase'
import ExercisePickerModal from './ExercisePickerModal'
import { theme } from '../styles/theme'
import { cardStyle, primaryButtonStyle } from '../styles/ui'
import type {
  WorkoutDay,
  WorkoutDayExercise,
  Exercise,
  Session,
  MuscleGroup,
  SessionExercise,
  FinishedSession,
  PersonalRecord,
  SetInput,
  Activity,
  SessionSet,
} from '../types'

function buildSessionExercises(dayExercises: WorkoutDayExercise[], sessions: Session[], workoutDayId: string, logDate: Date): SessionExercise[] {
  const prevWeekSession = getPreviousWeekSession(sessions, workoutDayId, logDate)

  return dayExercises.map(wde => {
    const ex = wde.exercises || { id: '', name: 'Unknown', alt_name: null, is_custom: false }
    const name = ex.name || 'Unknown'
    const targetSets = wde.target_sets || DEFAULT_SETS[name] || 3
    const targetReps = wde.target_reps || DEFAULT_REPS[name] || '—'
    const timed = isTimed(targetReps)
    const lastBest = bestSetForExercise(prevWeekSession, ex.id)

    return {
      exerciseId: ex.id,
      exerciseName: name,
      altName: ex.alt_name,
      altUsed: false,
      targetSets,
      targetReps,
      lastBest,
      lastWeekLabel: formatBestSetLabel(lastBest, timed),
      sets: Array.from({ length: targetSets }, (_, i) => emptySet(i + 1, lastBest, timed)),
    }
  })
}

/** Plan refreshes add new exercises only; `removedIds` keeps session removals sticky. */
function mergeSessionExercises(
  prev: SessionExercise[],
  dayExercises: WorkoutDayExercise[],
  sessions: Session[],
  workoutDayId: string,
  logDate: Date,
  removedIds: ReadonlySet<string> = new Set(),
): SessionExercise[] {
  const fromPlan = buildSessionExercises(dayExercises, sessions, workoutDayId, logDate)
  const seen = new Set(prev.map(ex => ex.exerciseId).filter(Boolean))
  const merged = [...prev]

  for (const planEx of fromPlan) {
    if (!planEx.exerciseId || seen.has(planEx.exerciseId) || removedIds.has(planEx.exerciseId)) continue
    merged.push(planEx)
    seen.add(planEx.exerciseId)
  }

  return merged
}

export { mergeSessionExercises }

export function buildResumedSessionExercises(activity: Activity, dayExercises: WorkoutDayExercise[]): SessionExercise[] {
  const groups = new Map<string, { rows: SessionSet[]; plan: WorkoutDayExercise | undefined }>()

  for (const row of activity.session_sets || []) {
    const key = row.exercise_id || row.exercise_name
    const existing = groups.get(key)
    if (existing) {
      existing.rows.push(row)
    } else {
      groups.set(key, {
        rows: [row],
        plan: dayExercises.find(dayExercise => dayExercise.exercise_id === row.exercise_id),
      })
    }
  }

  return [...groups.values()].map(({ rows, plan }) => {
    const sortedRows = [...rows].sort((a, b) => a.set_number - b.set_number)
    const first = sortedRows[0]
    const exerciseName = first.exercise_name
    const targetReps = plan?.target_reps || DEFAULT_REPS[exerciseName] || '—'
    const timed = isTimed(targetReps)

    return {
      exerciseId: first.exercise_id || plan?.exercise_id || '',
      exerciseName,
      altName: plan?.exercises?.alt_name || null,
      altUsed: first.alt_used,
      targetSets: plan?.target_sets || sortedRows.length,
      targetReps,
      lastBest: null,
      lastWeekLabel: null,
      sets: sortedRows.map(row => ({
        setNumber: row.set_number,
        weight: timed
          ? (row.duration_secs != null ? String(row.duration_secs) : '')
          : (row.weight_kg != null ? String(row.weight_kg) : ''),
        reps: timed ? '' : (row.reps != null ? String(row.reps) : ''),
        repeat: '1',
        done: row.done,
      })),
    }
  })
}

export function initialSessionStartMs(resumeActivity: Activity | null | undefined, now = Date.now()): number {
  return resumeActivity ? new Date(resumeActivity.started_at).getTime() : now
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface ActiveSessionProps {
  workoutDay: WorkoutDay
  dayExercises: WorkoutDayExercise[]
  exercises: Exercise[]
  sessions: Session[]
  muscleGroups: MuscleGroup[]
  logDate: Date | null
  resumeActivity?: Activity | null
  onBack: () => void
  onFinished: (session: FinishedSession) => void
  onExerciseAdded?: () => Promise<void>
  onPlanChanged?: () => Promise<void>
}

export default function ActiveSession({ workoutDay, dayExercises, exercises, sessions, muscleGroups, logDate, resumeActivity, onBack, onFinished, onExerciseAdded, onPlanChanged }: Readonly<ActiveSessionProps>) {
  const color = workoutDay.color
  const initialLogDate = logDate || (resumeActivity ? new Date(resumeActivity.started_at) : new Date())
  const logDateKey = toDateInputValue(initialLogDate)
  const startRef = useRef(initialSessionStartMs(resumeActivity))
  const sessionIdRef = useRef<string | null>(resumeActivity?.id ?? null)
  const startedAtRef = useRef<string | null>(resumeActivity?.started_at ?? null)
  const pendingSaveRef = useRef<SessionExercise[] | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionsRef = useRef(sessions)
  sessionsRef.current = sessions

  const [logDateStr, setLogDateStr] = useState(logDateKey)
  const isBackdated = logDateStr !== toDateInputValue(new Date())

  const logDateForHistory = new Date(`${logDateKey}T12:00:00`)

  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(() => {
    const resumed = resumeActivity
      ? buildResumedSessionExercises(resumeActivity, dayExercises)
      : []
    return resumed.length
      ? resumed
      : buildSessionExercises(dayExercises, sessions, workoutDay.id, logDateForHistory)
  })
  const [removedExerciseIds, setRemovedExerciseIds] = useState<Set<string>>(() => new Set())
  const removedExerciseIdsRef = useRef(removedExerciseIds)
  removedExerciseIdsRef.current = removedExerciseIds
  const [restTimer, setRestTimer] = useState<number | null>(null)
  const [showAddExercise, setShowAddExercise] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const persistSession = useCallback(async (exerciseList: SessionExercise[]) => {
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

  const scheduleSave = useCallback((exerciseList: SessionExercise[], immediate = false) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    if (immediate) {
      persistSession(exerciseList)
      return
    }
    saveTimerRef.current = setTimeout(() => persistSession(exerciseList), 400)
  }, [persistSession])

  useEffect(() => {
    const logDateObj = new Date(`${logDateStr}T12:00:00`)
    setSessionExercises(prev =>
      mergeSessionExercises(
        prev,
        dayExercises,
        sessionsRef.current,
        workoutDay.id,
        logDateObj,
        removedExerciseIdsRef.current,
      )
    )
  }, [workoutDay.id, dayExercises, logDateStr])

  useEffect(() => {
    if (resumeActivity) {
      sessionIdRef.current = resumeActivity.id
      startedAtRef.current = resumeActivity.started_at
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      }
    }

    const startedAt = dateAtNoon(logDateKey)
    createSession(
      { id: workoutDay.id, name: workoutDay.name, color: workoutDay.color },
      { startedAt },
    ).then(s => {
      sessionIdRef.current = s.id
      startedAtRef.current = s.started_at
      if (pendingSaveRef.current) {
        persistSession(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
    })
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [workoutDay.id, logDateKey, persistSession, resumeActivity])

  const handleLogDateChange = async (value: string) => {
    setLogDateStr(value)
    if (!sessionIdRef.current) return
    try {
      const startedAt = dateAtNoon(value)
      const updated = await updateSession(sessionIdRef.current, { startedAt })
      startedAtRef.current = updated.started_at
    } catch (err) {
      alert('Could not update date: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  useEffect(() => {
    if (restTimer === null || restTimer <= 0) return
    const t = setTimeout(() => setRestTimer(r => (r != null ? r - 1 : null)), 1000)
    return () => clearTimeout(t)
  }, [restTimer])

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetInput, value: string | boolean) => {
    setSessionExercises(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next)
      return next
    })
  }

  const toggleDone = (exIdx: number, setIdx: number) => {
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

  const addSet = (exIdx: number) => {
    setSessionExercises(prev => {
      const next = [...prev]
      const sets = next[exIdx].sets
      next[exIdx] = { ...next[exIdx], sets: [...sets, { setNumber: sets.length + 1, weight: '', reps: '', repeat: '1', done: false }] }
      scheduleSave(next, true)
      return next
    })
  }

  const toggleAlt = (exIdx: number) => {
    setSessionExercises(prev => {
      const next = [...prev]
      next[exIdx] = { ...next[exIdx], altUsed: !next[exIdx].altUsed }
      return next
    })
  }

  const appendExercise = (exerciseId: string, exerciseName: string, altName: string | null, numSets: number, targetReps: string) => {
    if (exerciseId) {
      setRemovedExerciseIds(prev => {
        if (!prev.has(exerciseId)) return prev
        const next = new Set(prev)
        next.delete(exerciseId)
        return next
      })
    }
    setSessionExercises(prev => {
      const next: SessionExercise[] = [
        ...prev,
        {
          exerciseId,
          exerciseName,
          altName,
          altUsed: false,
          targetSets: numSets,
          targetReps,
          lastBest: null,
          sets: Array.from({ length: numSets }, (_, i) => ({ setNumber: i + 1, weight: '', reps: '', repeat: '1', done: false })),
        },
      ]
      scheduleSave(next, true)
      return next
    })
  }

  const addToPlan = async (exerciseId: string, targetSets: number, targetReps: string) => {
    try {
      await addExerciseToWorkoutDay(workoutDay.id, exerciseId, { targetSets, targetReps })
      await onPlanChanged?.()
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string }
      if (error.code !== '23505' && !error.message?.includes('unique')) {
        alert('Could not add to plan: ' + (error.message || String(err)))
      }
    }
  }

  const handleSelectExisting = async (ex: Exercise, { sets: numSets, targetReps }: { sets: number; targetReps: string }) => {
    await addToPlan(ex.id, numSets, targetReps)
    appendExercise(ex.id, ex.name, ex.alt_name, numSets, targetReps)
    setShowAddExercise(false)
  }

  const handleCreateNew = async ({ name, altName, muscleGroupId, sets: numSets }: { name: string; altName: string | null; muscleGroupId: string; sets: number }) => {
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

  const removeExercise = (exIdx: number) => {
    const ex = sessionExercises[exIdx]
    const hasLogged = ex.sets.some(s => s.done || s.weight || s.reps)
    if (hasLogged && !window.confirm(`Remove ${ex.exerciseName} from today's session?`)) return
    if (ex.exerciseId) {
      setRemovedExerciseIds(prev => new Set(prev).add(ex.exerciseId))
    }
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
      const durationMins = isBackdated
        ? 45
        : Math.max(1, Math.round((Date.now() - startRef.current) / 60000))

      const allSets = sessionExercisesToRows(sessionExercises)

      await upsertSets(sessionIdRef.current, allSets)

      const prs: PersonalRecord[] = []
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

      const finished = await finishSession(sessionIdRef.current, {
        durationMins,
        note: '',
        startedAt: startedAtRef.current ?? undefined,
      })
      onFinished({ ...finished, workout_days: workoutDay, session_sets: allSets, prs })
    } catch (err) {
      alert('Error saving session: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const { done: doneCount, total: totalSets } = countLoggedSets(sessionExercises)

  const setGridCols = '24px 1fr 1fr 32px 36px'

  if (!dayExercises.length) {
    return (
      <div style={{ minHeight: '100vh', padding: 24, textAlign: 'center', background: theme.colors.background }}>
        <p style={{ fontWeight: 700, marginBottom: 8 }}>No exercises on this day</p>
        <p style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 16 }}>Go back and use the gear icon to add exercises to {workoutDay.name}.</p>
        <button type="button" onClick={handleBack} style={{ ...primaryButtonStyle, width: 'auto' }}>Go Back</button>
      </div>
    )
  }

  return (
    <div style={{ background: theme.colors.background, minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg, ${theme.colors.navy} 0%, ${color} 140%)`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 30 }}>
        <button type="button" aria-label="Back" onClick={handleBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: theme.font.display, fontSize: 18, fontWeight: 800, color: theme.colors.white }}>{workoutDay.name}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
            {doneCount}/{totalSets} sets logged
            {saveStatus === 'saving' && ' · Saving…'}
            {saveStatus === 'saved' && ' · Saved'}
            {saveStatus === 'error' && ' · Save failed'}
          </div>
        </div>
      </div>

      <div style={{ background: `linear-gradient(135deg, ${theme.colors.navy} 0%, ${color} 140%)`, padding: '0 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Date</span>
          <input
            type="date"
            value={logDateStr}
            max={toDateInputValue()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLogDateChange(e.target.value)}
            style={{ flex: 1, padding: '9px 11px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.18)', fontSize: 13, background: 'rgba(255,255,255,0.96)' }}
          />
        </div>
      </div>

      {restTimer !== null && restTimer > 0 && (
        <div style={{ background: theme.colors.navy, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Clock size={15} color={theme.colors.muted} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Rest {restTimer}s</span>
          <button type="button" onClick={() => setRestTimer(null)} style={{ background: theme.colors.navySoft, border: 'none', color: '#CBD5E1', borderRadius: 20, padding: '3px 11px', fontSize: 11, cursor: 'pointer' }}>Skip</button>
        </div>
      )}

      <div style={{ padding: '14px 20px 120px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sessionExercises.map((ex, exIdx) => {
            const displayName = ex.altUsed && ex.altName ? ex.altName : ex.exerciseName
            const timed = isTimed(ex.targetReps)
            return (
              <div key={exIdx} style={{ ...cardStyle, padding: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3, gap: 8 }}>
                  <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 15, color: theme.colors.text, flex: 1 }}>{displayName}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    {ex.altName && (
                      <button type="button" onClick={() => toggleAlt(exIdx)} style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'pointer', background: ex.altUsed ? color : '#F0F2F6', color: ex.altUsed ? theme.colors.white : theme.colors.muted }}>
                        ⇄ Alt
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeExercise(exIdx)}
                      title="Skip today"
                      style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <Trash2 size={13} color="#DC2626" />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 10 }}>
                  Target: {ex.targetSets}×{ex.targetReps}
                  {ex.lastWeekLabel && (
                    <span style={{ color: theme.colors.muted, fontWeight: 600 }}> · Last week max: {ex.lastWeekLabel}</span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: setGridCols, gap: 6, fontSize: 10, color: '#CBD5E1', fontWeight: 700, padding: '0 2px', marginBottom: 4 }}>
                  <div>SET</div>
                  <div>{timed ? 'SECS' : 'KG'}</div>
                  <div>{timed ? '—' : 'REPS'}</div>
                  <div>×</div>
                  <div />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {ex.sets.map((set, setIdx) => {
                    const repeat = setRepeatCount(set)
                    return (
                    <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: setGridCols, gap: 6, alignItems: 'center' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: theme.colors.muted, textAlign: 'center' }}>
                        {repeat > 1 ? `${set.setNumber}×${repeat}` : set.setNumber}
                      </div>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder={timed ? 'secs' : (ex.lastBest?.weight_kg != null ? String(ex.lastBest.weight_kg) : '0')}
                        value={set.weight}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                        style={{ padding: '9px 4px', borderRadius: 10, border: `1px solid ${set.done ? '#22B573' : theme.colors.line}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#E7F8EF' : theme.colors.white, outlineColor: theme.colors.brand }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder={timed ? '—' : (ex.lastBest?.reps != null ? String(ex.lastBest.reps) : '0')}
                        value={set.reps}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                        disabled={timed}
                        style={{ padding: '9px 4px', borderRadius: 10, border: `1px solid ${set.done ? '#22B573' : theme.colors.line}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#E7F8EF' : timed ? theme.colors.background : theme.colors.white, outlineColor: theme.colors.brand, opacity: timed ? 0.4 : 1 }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={10}
                        title="Repeat identical sets"
                        value={set.repeat ?? '1'}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'repeat', e.target.value)}
                        disabled={timed}
                        style={{ padding: '9px 2px', borderRadius: 10, border: `1px solid ${set.done ? '#22B573' : theme.colors.line}`, fontSize: 13, textAlign: 'center', width: '100%', background: set.done ? '#E7F8EF' : timed ? theme.colors.background : theme.colors.white, outlineColor: theme.colors.brand, opacity: timed ? 0.4 : 1 }}
                      />
                      <button type="button" onClick={() => toggleDone(exIdx, setIdx)} style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', background: set.done ? '#22B573' : '#F0F2F6', display: 'grid', placeItems: 'center', transition: 'all 0.15s' }}>
                        <Check size={16} color={set.done ? '#fff' : '#CBD5E1'} strokeWidth={3} />
                      </button>
                    </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 10, color: '#CBD5E1', marginTop: 8 }}>Use × for identical sets (e.g. 12kg × 12 × 2)</div>
                <button type="button" onClick={() => addSet(exIdx)} style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Add Set
                </button>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowAddExercise(true)}
          style={{ width: '100%', marginTop: 16, background: '#F1EEFF', border: `1px dashed ${color}`, borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> Add Exercise
        </button>

        <button
          type="button"
          onClick={handleFinish}
          disabled={saving}
          style={{ ...primaryButtonStyle, marginTop: 12, background: saving ? '#9CA3AF' : primaryButtonStyle.background, cursor: saving ? 'default' : 'pointer' }}
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
