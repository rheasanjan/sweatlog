import type { ReactNode } from 'react'
import { Dumbbell, Pencil } from 'lucide-react'
import { startOfWeek } from '../lib/program'
import { formatActivitySubtitle } from '../lib/activitySubtitle'
import { ACTIVITY_CATEGORIES, typesForCategory } from '../lib/activityCatalog'
import { theme } from '../styles/theme'
import type { Activity, BodyLogEntry } from '../types'
import ActivityIcon from './ActivityIcon'

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown date'
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

export interface HomeProps {
  activities: Activity[]
  bodyLog: BodyLogEntry[]
  onStart: () => void
  onEditSession: (session: Activity) => void
}

export default function Home({ activities, bodyLog, onStart, onEditSession }: Readonly<HomeProps>) {
  const weekStart = startOfWeek()
  const thisWeekFinished = activities.filter(
    activity => activity.status === 'completed' && new Date(activity.started_at) >= weekStart,
  )

  const latestWeight = bodyLog.length > 0
    ? [...bodyLog].sort((a, b) => b.date.localeCompare(a.date))[0].weight_kg
    : '—'

  const recent = [...activities].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).slice(0, 5)

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <header
        style={{
          background: `radial-gradient(120% 140% at 50% -10%, #1B2748 0%, ${theme.colors.navy} 60%)`,
          padding: '28px 20px 50px',
          textAlign: 'center',
          color: theme.colors.white,
        }}
      >
        <div style={{ fontFamily: theme.font.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 8 }}>Your Progress</div>
        <h1 style={{ margin: '0 0 20px', fontFamily: theme.font.display, fontSize: 34, fontWeight: 800, color: theme.colors.white, letterSpacing: '-0.02em' }}>Sweatlog</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
          <Stat value={latestWeight !== '—' ? `${latestWeight}kg` : '—'} label="Weight" />
          <Stat value={`${thisWeekFinished.length} activities`} label="This Week" />
        </div>
      </header>

      <main style={{ padding: '0 20px 32px', marginTop: -26 }}>
        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            background: `linear-gradient(135deg, ${theme.colors.brand} 0%, ${theme.colors.brandDark} 100%)`,
            color: theme.colors.white,
            border: 'none',
            borderRadius: 20,
            padding: '18px 20px',
            fontFamily: theme.font.display,
            fontSize: 17,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 14px 28px -10px rgba(61,92,255,0.55)',
            marginBottom: 30,
          }}
        >
          <Dumbbell size={20} /> Log Activity
        </button>

        <SectionLabel>Recent Activity</SectionLabel>
        {recent.length === 0 ? (
          <EmptyCard text="No activities yet. Log your first one above." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map(s => {
              const day = s.workout_days
              const presentation = ACTIVITY_CATEGORIES.find(item => item.id === s.category)
                ?? ACTIVITY_CATEGORIES[0]
              const type = s.category === 'strength'
                ? null
                : typesForCategory(s.category).find(item => item.label === s.name)
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => onEditSession(s)}
                  aria-label={`Edit ${s.name || day?.name || 'Activity'}`}
                  style={{
                    textAlign: 'left',
                    background: theme.colors.white,
                    borderRadius: 16,
                    padding: '13px 14px',
                    border: `1px solid ${theme.colors.line}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: presentation.softColor,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ActivityIcon
                      name={type?.icon ?? presentation.icon}
                      color={presentation.color}
                      size={20}
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: theme.colors.text }}>{s.name || day?.name || 'Activity'}</div>
                    <div style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2, fontWeight: 500 }}>
                      {formatActivitySubtitle(s, { relativeDate: daysAgo(s.started_at) })}
                    </div>
                  </div>
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: '#F0F2F6',
                      display: 'grid',
                      placeItems: 'center',
                      color: theme.colors.muted,
                      flexShrink: 0,
                    }}
                  >
                    <Pencil size={14} />
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

interface StatProps {
  value: string
  label: string
}

function Stat({ value, label }: Readonly<StatProps>) {
  return (
    <div style={{ minWidth: 128, padding: '11px 16px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, background: 'rgba(255,255,255,0.06)' }}>
      <div style={{ fontFamily: theme.font.display, fontSize: 19, fontWeight: 800, color: theme.colors.white }}>{value}</div>
      <div style={{ marginTop: 3, fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.45)', letterSpacing: '0.1em' }}>{label.toUpperCase()}</div>
    </div>
  )
}

export function SectionLabel({ children }: Readonly<{ children: ReactNode }>) {
  return <div style={{ margin: '0 0 12px 2px', fontFamily: theme.font.display, fontSize: 12, letterSpacing: '0.08em', color: theme.colors.muted, textTransform: 'uppercase', fontWeight: 800 }}>{children}</div>
}

export function EmptyCard({ text }: Readonly<{ text: string }>) {
  return <div style={{ background: theme.colors.white, border: `1px solid ${theme.colors.line}`, borderRadius: 16, padding: 20, textAlign: 'center', color: theme.colors.muted, fontSize: 13 }}>{text}</div>
}
