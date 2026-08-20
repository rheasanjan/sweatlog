import { useState, useMemo, useRef } from 'react'
import { Dumbbell, Plus, Settings2 } from 'lucide-react'
import {
  DAY_COLORS, lightColor, weekStartKey, toDateInputValue,
  formatWeekRange, startOfWeek,
} from '../lib/program'
import { createWorkoutDay, fetchInProgressSession, fetchWorkoutDayExercises } from '../lib/supabase'
import WorkoutDayEditor from './WorkoutDayEditor'
import type { Activity, WorkoutDay, Session, Exercise, MuscleGroup, WorkoutDayExercise } from '../types'
import { categoryTheme, theme } from '../styles/theme'
import { cardStyle, inputStyle, labelStyle, primaryButtonStyle } from '../styles/ui'
import ScreenHeader from './ui/ScreenHeader'

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never done yet'
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Last done: Today'
  if (d === 1) return 'Last done: Yesterday'
  return `Last done: ${d} days ago`
}

export interface PickerProps {
  workoutDays: WorkoutDay[]
  sessions: Session[]
  exercises: Exercise[]
  muscleGroups: MuscleGroup[]
  onBack: () => void
  onSelect: (day: WorkoutDay, logDate: Date) => void | Promise<void>
  onResume: (activity: Activity) => void | Promise<void>
  onDaysChanged: () => Promise<void>
}

export async function resolveTemplateSelection(
  day: WorkoutDay,
  logDate: Date,
  onSelect: (day: WorkoutDay, logDate: Date) => void | Promise<void>,
  onResume: (activity: Activity) => void | Promise<void>,
  findInProgress: (templateId: string) => Promise<Activity | null> = fetchInProgressSession,
) {
  const inProgress = await findInProgress(day.id)
  if (inProgress) {
    await onResume(inProgress)
    return
  }
  await onSelect(day, logDate)
}

export async function selectTemplateWithLock(
  lock: { current: boolean },
  day: WorkoutDay,
  logDate: Date,
  onSelect: (day: WorkoutDay, logDate: Date) => void | Promise<void>,
  onResume: (activity: Activity) => void | Promise<void>,
  findInProgress: (templateId: string) => Promise<Activity | null> = fetchInProgressSession,
) {
  if (lock.current) return
  lock.current = true
  try {
    await resolveTemplateSelection(day, logDate, onSelect, onResume, findInProgress)
  } finally {
    lock.current = false
  }
}

export default function Picker({
  workoutDays, sessions, exercises, muscleGroups,
  onBack, onSelect, onResume, onDaysChanged,
}: Readonly<PickerProps>) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingDay, setEditingDay] = useState<WorkoutDay | null>(null)
  const [editingExercises, setEditingExercises] = useState<WorkoutDayExercise[]>([])
  const [logDate, setLogDate] = useState(toDateInputValue())
  const selectingRef = useRef(false)

  const logDateObj = useMemo(() => new Date(`${logDate}T12:00:00`), [logDate])
  const selectedWeekKey = weekStartKey(logDateObj)
  const currentWeekKey = weekStartKey()
  const loggingCurrentWeek = selectedWeekKey === currentWeekKey
  const selectedWeekLabel = formatWeekRange(startOfWeek(logDateObj))

  const lastSessionFor = (workoutDayId: string): Session | null => {
    const matches = sessions.filter(s => s.workout_day_id === workoutDayId && s.finished_at)
    if (!matches.length) return null
    return matches.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0]
  }

  const handleDayClick = async (day: WorkoutDay) => {
    try {
      await selectTemplateWithLock(selectingRef, day, logDateObj, onSelect, onResume)
    } catch (err) {
      alert('Could not start: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  const openEditor = async (day: WorkoutDay) => {
    const exs = await fetchWorkoutDayExercises(day.id)
    setEditingDay(day)
    setEditingExercises(exs)
  }

  const handleCreated = async (day: WorkoutDay) => {
    await onDaysChanged()
    setShowCreate(false)
    await openEditor(day)
  }

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <ScreenHeader title="Choose Your Workout" subtitle="Pick a strength template" onBack={onBack} accent="#342779" />

      <div style={{ padding: '18px 20px 28px' }}>
        <div style={{ ...cardStyle, padding: '14px', marginBottom: 16 }}>
          <div style={labelStyle}>Workout date</div>
          <input
            type="date"
            value={logDate}
            max={toDateInputValue()}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogDate(e.target.value)}
            style={inputStyle}
          />
          <div style={{ fontSize: 11, color: loggingCurrentWeek ? theme.colors.muted : theme.colors.brand, marginTop: 7, fontWeight: loggingCurrentWeek ? 400 : 600 }}>
            {loggingCurrentWeek
              ? 'Logging for this week.'
              : `Backfilling for week of ${selectedWeekLabel}.`}
          </div>
        </div>
        <p style={{ fontSize: 13, color: theme.colors.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Pick a workout template to start a new session or resume one in progress.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workoutDays.map(day => {
            const last = lastSessionFor(day.id)
            const light = lightColor(day.color)
            return (
              <div key={day.id}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(day)}
                    style={{
                      ...cardStyle,
                      flex: 1, textAlign: 'left',
                      padding: '15px',
                      cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: theme.font.display, fontSize: 16, fontWeight: 800, color: theme.colors.text }}>{day.name}</span>
                      </div>
                      {day.subtitle && <div style={{ fontSize: 12, color: theme.colors.muted, marginTop: 3 }}>{day.subtitle}</div>}
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        {daysAgo(last?.started_at)}
                      </div>
                    </div>
                    <div style={{ width: 42, height: 42, borderRadius: 12, background: light || categoryTheme.strength.softColor, display: 'grid', placeItems: 'center', flexShrink: 0, marginLeft: 12 }}>
                      <Dumbbell size={18} color={day.color || categoryTheme.strength.color} />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditor(day)}
                    style={{ width: 46, background: theme.colors.white, border: `1px solid ${theme.colors.line}`, borderRadius: 14, cursor: 'pointer', display: 'grid', placeItems: 'center', flexShrink: 0 }}
                    title="Edit exercises"
                  >
                    <Settings2 size={18} color={theme.colors.muted} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          style={{ width: '100%', marginTop: 14, background: categoryTheme.strength.softColor, border: `1px dashed ${categoryTheme.strength.color}`, borderRadius: 16, padding: '14px', fontSize: 13, fontWeight: 700, color: categoryTheme.strength.color, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <Plus size={16} /> New Workout Day
        </button>
      </div>

      {showCreate && (
        <CreateWorkoutDayModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {editingDay && (
        <WorkoutDayEditor
          workoutDay={editingDay}
          dayExercises={editingExercises}
          exercises={exercises}
          muscleGroups={muscleGroups}
          onClose={() => setEditingDay(null)}
          onUpdated={async () => {
            const exs = await fetchWorkoutDayExercises(editingDay.id)
            setEditingExercises(exs)
            await onDaysChanged()
          }}
          onDeleted={async () => {
            setEditingDay(null)
            setEditingExercises([])
            await onDaysChanged()
          }}
        />
      )}
    </div>
  )
}

interface CreateWorkoutDayModalProps {
  onClose: () => void
  onCreated: (day: WorkoutDay) => Promise<void>
}

function CreateWorkoutDayModal({ onClose, onCreated }: Readonly<CreateWorkoutDayModalProps>) {
  const [name, setName] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [color, setColor] = useState(DAY_COLORS[0])
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const day = await createWorkoutDay({ name: name.trim(), subtitle: subtitle.trim() || null, color })
      await onCreated(day)
    } catch (err) {
      alert('Could not create workout day: ' + (err instanceof Error ? err.message : String(err)))
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(11,17,32,0.62)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: theme.colors.white, borderRadius: '22px 22px 0 0', padding: '22px 20px 32px', width: '100%', maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: theme.font.display, fontSize: 18, fontWeight: 800, marginBottom: 18 }}>New Workout Day</div>
        <Label>Name</Label>
        <Input autoFocus value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="e.g. Glutes, Upper, Full Body" />
        <Label>Subtitle (optional)</Label>
        <Input value={subtitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubtitle(e.target.value)} placeholder="e.g. Glutes · Hamstrings · Core" />
        <Label>Color</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {DAY_COLORS.map(c => (
            <button type="button" key={c} onClick={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', border: color === c ? `3px solid ${theme.colors.navy}` : `2px solid ${theme.colors.line}`, background: c, cursor: 'pointer' }} />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{ ...primaryButtonStyle, background: name.trim() && !saving ? primaryButtonStyle.background : '#D1D5DB', cursor: name.trim() && !saving ? 'pointer' : 'default' }}
        >
          {saving ? 'Creating…' : 'Create & Add Exercises'}
        </button>
      </div>
    </div>
  )
}

function Label({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div style={labelStyle}>{children}</div>
}

function Input(props: Readonly<React.InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, marginBottom: 16 }}
    />
  )
}
