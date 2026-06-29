import { useState, useMemo } from 'react'
import { X, Plus, Search, ChevronLeft } from 'lucide-react'
import { DEFAULT_SETS, DEFAULT_REPS } from '../lib/program'
import type { Exercise, MuscleGroup } from '../types'

function muscleLabel(ex: Exercise): string {
  return (ex.exercise_muscle_groups || [])
    .map(m => m.muscle_groups?.label)
    .filter(Boolean)
    .join(' · ') || '—'
}

export interface ExercisePickerModalProps {
  title?: string
  color?: string
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  excludeExerciseIds?: string[]
  onClose: () => void
  onSelectExisting: (ex: Exercise, opts: { sets: number; targetReps: string }) => Promise<void>
  onCreateNew: (opts: { name: string; altName: string | null; muscleGroupId: string; sets: number }) => Promise<void>
}

export default function ExercisePickerModal({
  title = 'Add Exercise',
  color = '#2563EB',
  exercises,
  muscleGroups,
  excludeExerciseIds = [],
  onClose,
  onSelectExisting,
  onCreateNew,
}: ExercisePickerModalProps) {
  const [mode, setMode] = useState<'list' | 'create'>('list')
  const [query, setQuery] = useState('')
  const [filterMuscle, setFilterMuscle] = useState('')
  const [sets, setSets] = useState(3)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [altName, setAltName] = useState('')
  const [muscleGroupId, setMuscleGroupId] = useState(muscleGroups[0]?.id || '')

  const excluded = useMemo(() => new Set(excludeExerciseIds), [excludeExerciseIds])

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return exercises
      .filter(e => e.id && !excluded.has(e.id))
      .filter(e => {
        if (filterMuscle) {
          const hasMuscle = (e.exercise_muscle_groups || []).some(
            m => m.muscle_groups?.slug === filterMuscle
          )
          if (!hasMuscle) return false
        }
        if (!q) return true
        const muscles = muscleLabel(e).toLowerCase()
        return (
          e.name.toLowerCase().includes(q) ||
          (e.alt_name && e.alt_name.toLowerCase().includes(q)) ||
          muscles.includes(q)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [exercises, excluded, query, filterMuscle])

  const handleSelect = async (ex: Exercise) => {
    if (saving) return
    setSaving(true)
    try {
      await onSelectExisting(ex, {
        sets: DEFAULT_SETS[ex.name] || sets,
        targetReps: DEFAULT_REPS[ex.name] || '8–12',
      })
      onClose()
    } catch (err) {
      alert('Could not add exercise: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onCreateNew({
        name: name.trim(),
        altName: altName.trim() || null,
        muscleGroupId,
        sets,
      })
      onClose()
    } catch (err) {
      alert('Could not save: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={onClose}>
      <div
        style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'create' && (
              <button onClick={() => setMode('list')} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={15} color="#64748B" />
              </button>
            )}
            <div style={{ fontSize: 17, fontWeight: 800 }}>{mode === 'create' ? 'New Exercise' : title}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} color="#64748B" />
          </button>
        </div>

        {mode === 'list' ? (
          <>
            <div style={{ position: 'relative', marginBottom: 10, flexShrink: 0 }}>
              <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                style={{ width: '100%', padding: '12px 12px 12px 38px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>
            <select
              value={filterMuscle}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMuscle(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 13, marginBottom: 12, background: '#fff', flexShrink: 0 }}
            >
              <option value="">All muscle groups</option>
              {muscleGroups.map(mg => (
                <option key={mg.id} value={mg.slug}>{mg.label}</option>
              ))}
            </select>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 12 }}>
              {available.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '24px 12px' }}>
                  {query || filterMuscle ? 'No exercises match your search.' : 'No exercises available.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {available.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelect(ex)}
                      disabled={saving}
                      style={{ textAlign: 'left', background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '12px 14px', cursor: saving ? 'default' : 'pointer' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{muscleLabel(ex)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setMode('create')}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: `1.5px dashed ${color}`, background: '#fff', color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}
            >
              <Plus size={16} /> Create new exercise
            </button>
          </>
        ) : (
          <div style={{ overflowY: 'auto' }}>
            <FieldLabel>Exercise name</FieldLabel>
            <FieldInput autoFocus value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Cable Crossover" />
            <FieldLabel>Alternative name (optional)</FieldLabel>
            <FieldInput value={altName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAltName(e.target.value)} placeholder="e.g. Pec Dec" />
            <FieldLabel>Muscle group</FieldLabel>
            <select
              value={muscleGroupId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMuscleGroupId(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 16, background: '#fff' }}
            >
              {muscleGroups.map(mg => (
                <option key={mg.id} value={mg.id}>{mg.label}</option>
              ))}
            </select>
            <FieldLabel>Number of sets</FieldLabel>
            <SetPicker sets={sets} onChange={setSets} color={color} />
            <button
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: name.trim() && !saving ? color : '#E2E8F0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: name.trim() && !saving ? 'pointer' : 'default' }}
            >
              {saving ? 'Saving…' : 'Add Exercise'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface SetPickerProps {
  sets: number
  onChange: (n: number) => void
  color: string
}

function SetPicker({ sets, onChange, color }: SetPickerProps) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {[2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${sets === n ? color : '#E2E8F0'}`, background: sets === n ? color : '#fff', color: sets === n ? '#fff' : '#64748B', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>{children}</div>
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
    />
  )
}
