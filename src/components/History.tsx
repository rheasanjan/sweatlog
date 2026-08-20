import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import {
  startOfWeek, addWeeks, formatWeekRange, formatSessionDate, sessionsInWeek,
} from '../lib/program'
import { buildWeeklySummary } from '../lib/weeklySummary'
import { formatActivitySubtitle } from '../lib/activitySubtitle'
import { ACTIVITY_CATEGORIES, typesForCategory } from '../lib/activityCatalog'
import { theme } from '../styles/theme'
import { cardStyle, sectionTitleStyle } from '../styles/ui'
import WeeklySummaryCard from './WeeklySummaryCard'
import ActivityIcon from './ActivityIcon'
import ScreenHeader from './ui/ScreenHeader'
import type { Activity } from '../types'

export interface HistoryProps {
  activities: Activity[]
  onBack: () => void
  onEditSession: (session: Activity) => void
}

export default function History({ activities, onBack, onEditSession }: Readonly<HistoryProps>) {
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
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <ScreenHeader title="History" subtitle="Your training timeline" onBack={onBack} />

      <div style={{ padding: '18px 20px 28px' }}>
        <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 14px' }}>
          <button
            type="button"
            onClick={() => setWeekOffset(o => o - 1)}
            aria-label="Previous week"
            style={{ background: '#F0F2F6', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <ChevronLeft size={18} color={theme.colors.muted} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: theme.font.display, fontSize: 14, fontWeight: 800, color: theme.colors.text }}>{isCurrentWeek ? 'This week' : weekLabel}</div>
            {isCurrentWeek && <div style={{ fontSize: 11, color: theme.colors.muted, marginTop: 2 }}>{weekLabel}</div>}
          </div>
          <button
            type="button"
            onClick={() => setWeekOffset(o => Math.min(o + 1, 0))}
            disabled={weekOffset >= 0}
            aria-label="Next week"
            style={{ background: '#F0F2F6', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'grid', placeItems: 'center', cursor: weekOffset >= 0 ? 'default' : 'pointer', opacity: weekOffset >= 0 ? 0.4 : 1 }}
          >
            <ChevronRight size={18} color={theme.colors.muted} />
          </button>
        </div>

        {weeklySummary && <WeeklySummaryCard summary={weeklySummary} />}

        <div style={sectionTitleStyle}>
          Activities {weekSessions.length ? `(${weekSessions.length})` : ''}
        </div>

        {weekSessions.length === 0 ? (
          <div style={{ ...cardStyle, padding: 24, textAlign: 'center', color: theme.colors.muted, fontSize: 13 }}>
            No activities this week. Log an activity from Home.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {weekSessions.map(s => {
              const setsLogged = (s.session_sets || []).filter(st => st.done).length
              const exerciseCount = new Set((s.session_sets || []).map(st => st.exercise_id)).size
              const presentation = ACTIVITY_CATEGORIES.find(item => item.id === s.category)
                ?? ACTIVITY_CATEGORIES[0]
              const type = s.category === 'strength'
                ? null
                : typesForCategory(s.category).find(item => item.label === s.name)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onEditSession(s)}
                  aria-label={`Edit ${s.name}`}
                  style={{ ...cardStyle, textAlign: 'left', padding: '13px 14px', cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <span style={{ width: 42, height: 42, borderRadius: 12, background: presentation.softColor, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    <ActivityIcon name={type?.icon ?? presentation.icon} color={presentation.color} size={20} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: theme.font.display, fontWeight: 800, fontSize: 14.5 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: theme.colors.muted, marginTop: 3 }}>
                      {formatActivitySubtitle(s, { relativeDate: formatSessionDate(s.started_at) })}
                    </div>
                    {s.category === 'strength' && (
                      <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                        {exerciseCount} exercises · {setsLogged} sets logged
                      </div>
                    )}
                  </div>
                  <span style={{ width: 30, height: 30, borderRadius: 9, background: '#F0F2F6', display: 'grid', placeItems: 'center', color: theme.colors.muted }}>
                    <Pencil size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
