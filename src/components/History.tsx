import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, Pencil } from 'lucide-react'
import {
  startOfWeek, addWeeks, formatWeekRange, formatSessionDate, weekStartKey,
  lightColor, toDateInputValue, weekDateBounds, defaultLogDateForWeek,
  sessionsInWeek, getSessionForWeek,
} from '../lib/program'
import type { Session, WorkoutDay, WorkoutSkip } from '../types'

interface LogModalState {
  day: WorkoutDay
  date: string
}

export interface HistoryProps {
  sessions: Session[]
  workoutDays: WorkoutDay[]
  weekSkips: WorkoutSkip[]
  onBack: () => void
  onEditSession: (session: Session) => void
  onLogSession: (day: WorkoutDay, logDate: Date) => void
}

export default function History({ sessions, workoutDays, weekSkips, onBack, onEditSession, onLogSession }: HistoryProps) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [logModal, setLogModal] = useState<LogModalState | null>(null)

  const weekMonday = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset)), [weekOffset])
  const weekKey = weekStartKey(weekMonday)
  const weekLabel = formatWeekRange(weekMonday)
  const isCurrentWeek = weekOffset === 0
  const { start: weekStart, end: weekEnd } = weekDateBounds(weekMonday)

  const weekSessions = useMemo(
    () => sessionsInWeek(sessions, weekMonday).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    [sessions, weekMonday]
  )

  const weekSkipIds = new Set(
    (weekSkips || []).filter(s => s.week_start === weekKey).map(s => s.workout_day_id)
  )

  const openLogModal = (day: WorkoutDay) => {
    setLogModal({
      day,
      date: defaultLogDateForWeek(weekMonday),
    })
  }

  const confirmLog = () => {
    if (!logModal) return
    onLogSession(logModal.day, new Date(`${logModal.date}T12:00:00`))
    setLogModal(null)
  }

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Workout History</div>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, background: '#fff', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} color="#64748B" />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{isCurrentWeek ? 'This week' : weekLabel}</div>
            {isCurrentWeek && <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{weekLabel}</div>}
          </div>
          <button
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            style={{ background: '#F1F5F9', border: 'none', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: weekOffset >= 0 ? 'default' : 'pointer', opacity: weekOffset >= 0 ? 0.4 : 1 }}
          >
            <ChevronRight size={18} color="#64748B" />
          </button>
        </div>

        <div style={{ fontSize: 11, letterSpacing: 2, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>Week overview</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {workoutDays.map(day => {
            const session = getSessionForWeek(sessions, day.id, weekMonday)
            const done = !!session
            const skipped = weekSkipIds.has(day.id)
            const light = lightColor(day.color)
            return (
              <div
                key={day.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: done ? light : '#fff',
                  border: `1.5px solid ${done ? day.color : skipped ? '#CBD5E1' : '#E2E8F0'}`,
                  borderRadius: 10, padding: '10px 12px',
                  opacity: skipped && !done ? 0.75 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: done ? day.color : skipped ? '#94A3B8' : '#E2E8F0' }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{day.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>
                      {done && session ? formatSessionDate(session.started_at) : skipped ? 'Skipped' : 'Not logged'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {skipped && !done && <Minus size={14} color="#94A3B8" />}
                  {done && session && (
                    <button
                      type="button"
                      onClick={() => onEditSession(session)}
                      style={{ background: '#EFF6FF', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#2563EB', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  )}
                  {!done && !skipped && (
                    <button
                      type="button"
                      onClick={() => openLogModal(day)}
                      style={{ background: day.color, border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Plus size={12} /> Log
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: 11, letterSpacing: 2, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
          Sessions {weekSessions.length ? `(${weekSessions.length})` : ''}
        </div>

        {weekSessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No workouts logged this week. Tap <strong>Log</strong> above to backfill one.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekSessions.map(s => {
              const day = s.workout_days
              const color = day?.color || '#2563EB'
              const setsLogged = (s.session_sets || []).filter(st => st.done).length
              const exerciseCount = new Set((s.session_sets || []).map(st => st.exercise_id)).size
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onEditSession(s)}
                  style={{ textAlign: 'left', background: '#fff', borderRadius: 12, padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: 'none', borderLeft: `3px solid ${color}`, cursor: 'pointer', width: '100%' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{day?.name || 'Workout'}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                        {formatSessionDate(s.started_at)}
                        {s.duration_mins ? ` · ${s.duration_mins} min` : ''}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                        {exerciseCount} exercises · {setsLogged} sets logged
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>Edit</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {logModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end', zIndex: 50 }} onClick={() => setLogModal(null)}>
          <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: '20px 16px 32px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>Log {logModal.day.name}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginBottom: 16 }}>When did you do this workout?</div>
            <input
              type="date"
              value={logModal.date}
              min={toDateInputValue(weekStart)}
              max={toDateInputValue(weekEnd)}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogModal(m => m ? ({ ...m, date: e.target.value }) : null)}
              style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />
            <button
              onClick={confirmLog}
              style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', background: logModal.day.color, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
            >
              Start Logging
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
