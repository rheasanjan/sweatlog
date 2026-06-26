import { useState } from 'react'
import { Dumbbell, ChevronLeft, Plus, Settings2 } from 'lucide-react'
import { DAY_COLORS, lightColor, startOfWeek, weekStartKey } from '../lib/program'
import { createWorkoutDay, fetchWorkoutDayExercises, skipWorkoutForWeek, unskipWorkoutForWeek } from '../lib/supabase'
import WorkoutDayEditor from './WorkoutDayEditor'

function daysAgo(dateStr) {
  if (!dateStr) return 'Never done yet'
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Last done: Today'
  if (d === 1) return 'Last done: Yesterday'
  return `Last done: ${d} days ago`
}

function startOfWeekLocal() {
  return startOfWeek()
}

export default function Picker({ workoutDays, sessions, weekSkips, exercises, muscleGroups, onBack, onSelect, onDaysChanged }) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingDay, setEditingDay] = useState(null)
  const [editingExercises, setEditingExercises] = useState([])
  const [skipSaving, setSkipSaving] = useState(null)

  const weekKey = weekStartKey()
  const weekStart = startOfWeekLocal()
  const doneThisWeek = new Set(
    sessions.filter(s => new Date(s.started_at) >= weekStart).map(s => s.workout_day_id)
  )
  const skippedThisWeek = new Set(
    (weekSkips || []).filter(s => s.week_start === weekKey).map(s => s.workout_day_id)
  )

  const lastSessionFor = (workoutDayId) => {
    const matches = sessions.filter(s => s.workout_day_id === workoutDayId && s.finished_at)
    if (!matches.length) return null
    return matches.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0]
  }

  const openEditor = async (day) => {
    const exs = await fetchWorkoutDayExercises(day.id)
    setEditingDay(day)
    setEditingExercises(exs)
  }

  const handleCreated = async (day) => {
    await onDaysChanged()
    setShowCreate(false)
    await openEditor(day)
  }

  const handleSkip = async (day, e) => {
    e.stopPropagation()
    if (skipSaving) return
    setSkipSaving(day.id)
    try {
      await skipWorkoutForWeek(day.id, weekKey)
      await onDaysChanged()
    } catch (err) {
      alert('Could not skip: ' + err.message)
    } finally {
      setSkipSaving(null)
    }
  }

  const handleUnskip = async (day, e) => {
    e.stopPropagation()
    if (skipSaving) return
    setSkipSaving(day.id)
    try {
      await unskipWorkoutForWeek(day.id, weekKey)
      await onDaysChanged()
    } catch (err) {
      alert('Could not undo skip: ' + err.message)
    } finally {
      setSkipSaving(null)
    }
  }

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Choose Your Workout</div>
      </div>

      <div style={{ padding: '16px' }}>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
          Pick a workout day — aim to hit all {workoutDays.length} by the end of the week. Use the gear icon to edit your plan.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {workoutDays.map(day => {
            const last = lastSessionFor(day.id)
            const done = doneThisWeek.has(day.id)
            const skipped = skippedThisWeek.has(day.id)
            const light = lightColor(day.color)
            const saving = skipSaving === day.id
            return (
              <div key={day.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => !skipped && onSelect(day)}
                    disabled={skipped}
                    style={{
                      flex: 1, textAlign: 'left', background: '#fff',
                      border: `1.5px solid ${done ? day.color : skipped ? '#CBD5E1' : '#E2E8F0'}`,
                      borderRadius: 14, padding: '16px',
                      cursor: skipped ? 'default' : 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      opacity: skipped ? 0.75 : 1,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{day.name}</span>
                        {done && (
                          <span style={{ background: light, color: day.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>DONE THIS WEEK</span>
                        )}
                        {skipped && !done && (
                          <span style={{ background: '#F1F5F9', color: '#94A3B8', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>SKIPPED</span>
                        )}
                      </div>
                      {day.subtitle && <div style={{ fontSize: 12, color: '#64748B', marginTop: 3 }}>{day.subtitle}</div>}
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>{daysAgo(last?.started_at)}</div>
                    </div>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: light, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12 }}>
                      <Dumbbell size={17} color={day.color} />
                    </div>
                  </button>
                  <button
                    onClick={() => openEditor(day)}
                    style={{ width: 44, background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    title="Edit exercises"
                  >
                    <Settings2 size={18} color="#64748B" />
                  </button>
                </div>
                {!done && (
                  skipped ? (
                    <button
                      onClick={e => handleUnskip(day, e)}
                      disabled={saving}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#64748B', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}
                    >
                      {saving ? 'Saving…' : 'Undo skip — I\'ll do it this week'}
                    </button>
                  ) : (
                    <button
                      onClick={e => handleSkip(day, e)}
                      disabled={saving}
                      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#94A3B8', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: '0 4px' }}
                    >
                      {saving ? 'Saving…' : 'Not doing this workout this week'}
                    </button>
                  )
                )}
              </div>
            )
          })}
        </div>

        <button
          onClick={() => setShowCreate(true)}
          style={{ width: '100%', marginTop: 14, background: '#fff', border: '1.5px dashed #2563EB', borderRadius: 14, padding: '14px', fontSize: 13, fontWeight: 700, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
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
        />
      )}
    </div>
  )
}

function CreateWorkoutDayModal({ onClose, onCreated }) {
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
      alert('Could not create workout day: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 16 }}>New Workout Day</div>
        <Label>Name</Label>
        <Input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Glutes, Upper, Full Body" />
        <Label>Subtitle (optional)</Label>
        <Input value={subtitle} onChange={e => setSubtitle(e.target.value)} placeholder="e.g. Glutes · Hamstrings · Core" />
        <Label>Color</Label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {DAY_COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{ width: 36, height: 36, borderRadius: '50%', border: color === c ? '3px solid #0F172A' : '2px solid #E2E8F0', background: c, cursor: 'pointer' }} />
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: name.trim() && !saving ? color : '#E2E8F0', color: '#fff', fontWeight: 700, fontSize: 14, cursor: name.trim() && !saving ? 'pointer' : 'default' }}
        >
          {saving ? 'Creating…' : 'Create & Add Exercises'}
        </button>
      </div>
    </div>
  )
}

function Label({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>{children}</div>
}

function Input(props) {
  return (
    <input
      {...props}
      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' }}
    />
  )
}
