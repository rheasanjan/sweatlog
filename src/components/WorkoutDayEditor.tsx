import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { DEFAULT_SETS, DEFAULT_REPS } from '../lib/program'
import { addCustomExercise, addExerciseToWorkoutDay, removeExerciseFromWorkoutDay } from '../lib/supabase'
import ExercisePickerModal from './ExercisePickerModal'
import type { WorkoutDay, WorkoutDayExercise, Exercise, MuscleGroup } from '../types'

export interface WorkoutDayEditorProps {
  workoutDay: WorkoutDay
  dayExercises: WorkoutDayExercise[]
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  onClose: () => void
  onUpdated: () => Promise<void>
}

export default function WorkoutDayEditor({ workoutDay, dayExercises, exercises, muscleGroups, onClose, onUpdated }: WorkoutDayEditorProps) {
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const assignedIds = dayExercises.map(d => d.exercise_id)

  const handleSelectExisting = async (ex: Exercise) => {
    if (saving) return
    setSaving(true)
    try {
      await addExerciseToWorkoutDay(workoutDay.id, ex.id, {
        targetSets: DEFAULT_SETS[ex.name] || 3,
        targetReps: DEFAULT_REPS[ex.name] || '8–12',
      })
      await onUpdated()
      setShowPicker(false)
    } catch (err) {
      alert('Could not add exercise: ' + (err instanceof Error ? err.message : String(err)))
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (wdeId: string, exerciseName: string | undefined) => {
    if (saving) return
    if (!window.confirm(`Remove ${exerciseName} from your ${workoutDay.name} plan?`)) return
    setSaving(true)
    try {
      await removeExerciseFromWorkoutDay(wdeId)
      await onUpdated()
    } catch (err) {
      alert('Could not remove exercise: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateNew = async ({ name, altName, muscleGroupId, sets }: { name: string; altName: string | null; muscleGroupId: string; sets: number }) => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await addCustomExercise({
        name,
        altName,
        muscleGroupIds: muscleGroupId ? [muscleGroupId] : [],
      })
      await addExerciseToWorkoutDay(workoutDay.id, saved.id, {
        targetSets: sets,
        targetReps: '8–12',
      })
      await onUpdated()
      setShowPicker(false)
    } catch (err) {
      alert('Could not create exercise: ' + (err instanceof Error ? err.message : String(err)))
      throw err
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{workoutDay.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Use the trash icon to remove from your plan</div>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="#64748B" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
          {dayExercises.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: 16 }}>No exercises yet. Add some below.</div>
          ) : (
            dayExercises.map(wde => (
              <div key={wde.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8FAFC', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{wde.exercises?.name}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8' }}>{wde.target_sets}×{wde.target_reps}</div>
                </div>
                <button onClick={() => handleRemove(wde.id, wde.exercises?.name)} disabled={saving} title="Remove from plan" style={{ background: '#FEF2F2', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Trash2 size={14} color="#DC2626" />
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => setShowPicker(true)}
          style={{ width: '100%', padding: '12px', borderRadius: 12, border: `1.5px dashed ${workoutDay.color}`, background: '#fff', color: workoutDay.color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> Add Exercise
        </button>
      </div>

      {showPicker && (
        <ExercisePickerModal
          title="Add to Workout Day"
          color={workoutDay.color}
          exercises={exercises}
          muscleGroups={muscleGroups}
          excludeExerciseIds={assignedIds}
          onClose={() => setShowPicker(false)}
          onSelectExisting={handleSelectExisting}
          onCreateNew={handleCreateNew}
        />
      )}
    </div>
  )
}
