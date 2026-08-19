import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfWeek, addWeeks, formatWeekRange, formatSessionDate, sessionsInWeek,
} from '../lib/program'
import { buildWeeklySummary } from '../lib/weeklySummary'
import { formatActivitySubtitle } from '../lib/activitySubtitle'
import WeeklySummaryCard from './WeeklySummaryCard'
import type { Activity } from '../types'

export interface HistoryProps {
  activities: Activity[]
  onBack: () => void
  onEditSession: (session: Activity) => void
}

export default function History({ activities, onBack, onEditSession }: HistoryProps) {
  const [weekOffset, setWeekOffset] = useState(0)

  const weekMonday = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset)), [weekOffset])
  const weekLabel = formatWeekRange(weekMonday)
  const isCurrentWeek = weekOffset === 0

  const weekSessions = useMemo(
    () => sessionsInWeek(activities, weekMonday).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()),
    [activities, weekMonday]
  )

  const weeklySummary = useMemo(
    () => isCurrentWeek
      ? buildWeeklySummary({ sessions: activities, weekMonday })
      : null,
    [activities, isCurrentWeek, weekMonday]
  )

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '18px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="#fff" />
        </button>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>History</div>
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

        {weeklySummary && <WeeklySummaryCard summary={weeklySummary} />}

        <div style={{ fontSize: 11, letterSpacing: 2, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
          Activities {weekSessions.length ? `(${weekSessions.length})` : ''}
        </div>

        {weekSessions.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>
            No activities this week. Log an activity from Home.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {weekSessions.map(s => {
              const setsLogged = (s.session_sets || []).filter(st => st.done).length
              const exerciseCount = new Set((s.session_sets || []).map(st => st.exercise_id)).size
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onEditSession(s)}
                  style={{ textAlign: 'left', background: '#fff', borderRadius: 12, padding: '14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: 'none', borderLeft: `3px solid ${s.color}`, cursor: 'pointer', width: '100%' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                        {formatActivitySubtitle(s, { relativeDate: formatSessionDate(s.started_at) })}
                      </div>
                      {s.category === 'strength' && (
                        <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                          {exerciseCount} exercises · {setsLogged} sets logged
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#2563EB' }}>Edit</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
