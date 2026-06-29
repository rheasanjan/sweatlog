import { useState, useRef, useCallback, useEffect } from 'react'
import { ChevronLeft, Check, Trash2, Plus } from 'lucide-react'
import { DEFAULT_REPS, isTimed, toDateInputValue, dateAtNoon, setRepeatCount } from '../lib/program'
import { editExercisesToRows } from '../lib/sessionSets'
import { upsertSets, updateSession } from '../lib/supabase'
import ExercisePickerModal from './ExercisePickerModal'
import type { Session, Exercise, MuscleGroup, SessionSet, ExerciseSetGroup, SetInput } from '../types'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function buildEditableExercises(sessionSets: SessionSet[] | undefined): ExerciseSetGroup[] {
  const byExercise = new Map<string, ExerciseSetGroup>()
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
    byExercise.get(key)!.sets.push({
      setNumber: s.set_number,
      weight: timed
        ? (s.duration_secs != null ? String(s.duration_secs) : '')
        : (s.weight_kg != null ? String(s.weight_kg) : ''),
      reps: timed ? '' : (s.reps != null ? String(s.reps) : ''),
      repeat: '1',
      done: s.done,
    })
  })

  return [...byExercise.values()]
}

export interface SessionEditProps {
  session: Session
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  onBack: () => void
  onSaved?: () => Promise<void>
}

export default function SessionEdit({ session, exercises, muscleGroups, onBack, onSaved }: SessionEditProps) {
  const day = session.workout_days
  const color = day?.color || '#2563EB'

  const [exercisesState, setExercisesState] = useState<ExerciseSetGroup[]>(() => buildEditableExercises(session.session_sets))
  const [dateValue, setDateValue] = useState(toDateInputValue(new Date(session.started_at)))
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [showAddExercise, setShowAddExercise] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistSession = useCallback(async (exerciseList: ExerciseSetGroup[]) => {
    setSaveStatus('saving')
    try {
      await upsertSets(session.id, editExercisesToRows(exerciseList))
      await onSaved?.()
      setSaveStatus('saved')
    } catch (err) {
      setSaveStatus('error')
      alert('Could not save: ' + (err instanceof Error ? err.message : String(err)))
    }
  }, [session.id, onSaved])

  const scheduleSave = useCallback((exerciseList: ExerciseSetGroup[], immediate = false) => {
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

  const handleDateChange = async (value: string) => {
    setDateValue(value)
    try {
      await updateSession(session.id, { startedAt: dateAtNoon(value) })
      await onSaved?.()
    } catch (err) {
      alert('Could not update date: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const updateSet = (exIdx: number, setIdx: number, field: keyof SetInput, value: string | boolean) => {
    setExercisesState(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: value }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next)
      return next
    })
  }

  const toggleDone = (exIdx: number, setIdx: number) => {
    setExercisesState(prev => {
      const next = [...prev]
      const sets = [...next[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], done: !sets[setIdx].done }
      next[exIdx] = { ...next[exIdx], sets }
      scheduleSave(next, true)
      return next
    })
  }

  const addSet = (exIdx: number) => {
    setExercisesState(prev => {
      const next = [...prev]
      const sets = next[exIdx].sets
      next[exIdx] = {
        ...next[exIdx],
        sets: [...sets, { setNumber: sets.length + 1, weight: '', reps: '', repeat: '1', done: false }],
      }
      scheduleSave(next, true)
      return next
    })
  }

  const removeExercise = (exIdx: number) => {
    const ex = exercisesState[exIdx]
    if (!window.confirm(`Remove ${ex.exerciseName} from this session?`)) return
    setExercisesState(prev => {
      const next = prev.filter((_, i) => i !== exIdx)
      scheduleSave(next, true)
      return next
    })
  }

  const appendExercise = (exerciseId: string, exerciseName: string, numSets: number, targetReps: string) => {
    setExercisesState(prev => {
      const next: ExerciseSetGroup[] = [
        ...prev,
        {
          exerciseId,
          exerciseName,
          altUsed: false,
          targetReps,
          sets: Array.from({ length: numSets }, (_, i) => ({
            setNumber: i + 1, weight: '', reps: '', repeat: '1', done: false,
          })),
        },
      ]
      scheduleSave(next, true)
      return next
    })
  }

  const handleSelectExisting = async (ex: Exercise, { sets: numSets, targetReps }: { sets: number; targetReps: string }) => {
    appendExercise(ex.id, ex.name, numSets, targetReps)
    setShowAddExercise(false)
  }

  const sessionExerciseIds = exercisesState.map(ex => ex.exerciseId).filter((id): id is string => Boolean(id))
  const setGridCols = '24px 1fr 1fr 32px 36px'

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100vh', paddingBottom: 100 }}>
      <div style={{ background: color, padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 30 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>{day?.name || 'Workout'}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
            {saveStatus === 'saving' && 'Saving…'}
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'error' && 'Save failed'}
          </div>
        </div>
      </div>

      <div style={{ background: color, padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>Date</span>
          <input
            type="date"
            value={dateValue}
            max={toDateInputValue()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleDateChange(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: 'none', fontSize: 13, background: 'rgba(255,255,255,0.95)' }}
          />
        </div>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {exercisesState.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: 32 }}>No exercises logged. Add one below.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {exercisesState.map((ex, exIdx) => {
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
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textAlign: 'center' }}>
                          {repeat > 1 ? `${set.setNumber}×${repeat}` : set.setNumber}
                        </div>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={set.weight}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                          style={{ padding: '9px 4px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : '#fff', outline: 'none' }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          value={set.reps}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                          disabled={timed}
                          style={{ padding: '9px 4px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 14, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : timed ? '#F8FAFC' : '#fff', outline: 'none', opacity: timed ? 0.4 : 1 }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={10}
                          value={set.repeat ?? '1'}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSet(exIdx, setIdx, 'repeat', e.target.value)}
                          disabled={timed}
                          style={{ padding: '9px 2px', borderRadius: 8, border: `1.5px solid ${set.done ? '#10B981' : '#E2E8F0'}`, fontSize: 13, textAlign: 'center', width: '100%', background: set.done ? '#F0FDF4' : timed ? '#F8FAFC' : '#fff', outline: 'none', opacity: timed ? 0.4 : 1 }}
                        />
                        <button onClick={() => toggleDone(exIdx, setIdx)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: set.done ? '#10B981' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Check size={16} color={set.done ? '#fff' : '#CBD5E1'} strokeWidth={3} />
                        </button>
                      </div>
                      )
                    })}
                  </div>
                  <button onClick={() => addSet(exIdx)} style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    + Add Set
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => setShowAddExercise(true)}
          style={{ width: '100%', marginTop: 16, background: '#fff', border: `1.5px dashed ${color}`, borderRadius: 12, padding: '14px', fontSize: 13, fontWeight: 700, color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> Add Exercise
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
          onCreateNew={async () => { alert('Create exercises from your workout plan editor.'); setShowAddExercise(false) }}
        />
      )}
    </div>
  )
}
