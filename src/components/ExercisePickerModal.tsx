import { useState, useMemo } from 'react'
import { X, Plus, Search, ChevronLeft } from 'lucide-react'
import { DEFAULT_SETS, DEFAULT_REPS } from '../lib/program'
import type { Exercise, MuscleGroup } from '../types'
import { theme } from '../styles/theme'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '../styles/ui'

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
}: Readonly<ExercisePickerModalProps>) {
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,32,0.62)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div
        style={{ background: theme.colors.white, borderRadius: '22px 22px 0 0', padding: '22px 20px 32px', width: '100%', maxWidth: 480, maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {mode === 'create' && (
              <button type="button" aria-label="Back" onClick={() => setMode('list')} style={{ background: '#F0F2F6', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={15} color={theme.colors.muted} />
              </button>
            )}
            <div style={{ fontFamily: theme.font.display, fontSize: 18, fontWeight: 800 }}>{mode === 'create' ? 'New Exercise' : title}</div>
          </div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ background: '#F0F2F6', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <X size={15} color={theme.colors.muted} />
          </button>
        </div>

        {mode === 'list' ? (
          <>
            <div style={{ position: 'relative', marginBottom: 10, flexShrink: 0 }}>
              <Search size={16} color={theme.colors.muted} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                autoFocus
                value={query}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                style={{ ...inputStyle, paddingLeft: 38 }}
              />
            </div>
            <select
              value={filterMuscle}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMuscle(e.target.value)}
              style={{ ...inputStyle, fontSize: 13, marginBottom: 12, flexShrink: 0 }}
            >
              <option value="">All muscle groups</option>
              {muscleGroups.map(mg => (
                <option key={mg.id} value={mg.slug}>{mg.label}</option>
              ))}
            </select>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, marginBottom: 12 }}>
              {available.length === 0 ? (
                <div style={{ textAlign: 'center', color: theme.colors.muted, fontSize: 13, padding: '24px 12px' }}>
                  {query || filterMuscle ? 'No exercises match your search.' : 'No exercises available.'}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {available.map(ex => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => handleSelect(ex)}
                      disabled={saving}
                      style={{ ...cardStyle, textAlign: 'left', padding: '12px 14px', cursor: saving ? 'default' : 'pointer' }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: theme.colors.text }}>{ex.name}</div>
                      <div style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>{muscleLabel(ex)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setMode('create')}
              style={{ width: '100%', padding: '14px', borderRadius: 14, border: `1px dashed ${color}`, background: '#F1EEFF', color, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0 }}
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
              style={{ ...inputStyle, marginBottom: 16 }}
            >
              {muscleGroups.map(mg => (
                <option key={mg.id} value={mg.id}>{mg.label}</option>
              ))}
            </select>
            <FieldLabel>Number of sets</FieldLabel>
            <SetPicker sets={sets} onChange={setSets} color={color} />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              style={{ ...primaryButtonStyle, background: name.trim() && !saving ? primaryButtonStyle.background : '#D1D5DB', cursor: name.trim() && !saving ? 'pointer' : 'default' }}
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

function SetPicker({ sets, onChange, color }: Readonly<SetPickerProps>) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      {[2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: `1px solid ${sets === n ? color : theme.colors.line}`, background: sets === n ? color : theme.colors.white, color: sets === n ? theme.colors.white : theme.colors.muted, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={labelStyle}>{children}</div>
}

function FieldInput(props: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, marginBottom: 16 }}
    />
  )
}
