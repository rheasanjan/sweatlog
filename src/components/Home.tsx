import type { ReactNode } from 'react'
import { Dumbbell } from 'lucide-react'
import { lightColor, startOfWeek } from '../lib/program'
import type { Activity, BodyLogEntry, WorkoutTemplate } from '../types'

function daysAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d} days ago`
}

export interface HomeProps {
  templates: WorkoutTemplate[]
  activities: Activity[]
  bodyLog: BodyLogEntry[]
  onStart: () => void
  onStartTemplate: (template: WorkoutTemplate) => void
  onEditSession: (session: Activity) => void
}

export default function Home({ templates, activities, bodyLog, onStart, onStartTemplate, onEditSession }: HomeProps) {
  const weekStart = startOfWeek()
  const thisWeekFinished = activities.filter(
    activity => activity.status === 'completed' && new Date(activity.started_at) >= weekStart,
  )

  const latestWeight = bodyLog.length > 0
    ? [...bodyLog].sort((a, b) => b.date.localeCompare(a.date))[0].weight_kg
    : '—'

  const recent = [...activities].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()).slice(0, 5)

  const gridCols = Math.min(templates.length, 5)

  return (
    <div>
      <div style={{ background: '#0F172A', padding: '28px 20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Your Progress</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#F8FAFC', letterSpacing: -0.5 }}>Sweatlog</h1>
        <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 28 }}>
          <Stat value={latestWeight !== '—' ? `${latestWeight}kg` : '—'} label="Weight" />
          <Stat value={`${thisWeekFinished.length} sessions`} label="This Week" />
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        <SectionLabel>Templates</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 8, marginBottom: 24 }}>
          {templates.map(day => {
            const light = lightColor(day.color)
            return (
              <button
                type="button"
                key={day.id}
                onClick={() => onStartTemplate(day)}
                style={{
                  background: light,
                  border: `1.5px solid ${day.color}`,
                  borderRadius: 12,
                  padding: '10px 4px',
                  textAlign: 'center',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: day.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 6px',
                }} />
                <div style={{
                  fontSize: 10, fontWeight: 700,
                  color: day.color,
                  lineHeight: 1.2,
                }}>
                  {day.name.split(' ')[0]}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={onStart}
          style={{ width: '100%', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(37,99,235,0.25)', marginBottom: 28 }}
        >
          <Dumbbell size={18} /> Log a Workout
        </button>

        <SectionLabel>Recent Activity</SectionLabel>
        {recent.length === 0 ? (
          <EmptyCard text="No sessions yet. Start your first one above." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent.map(s => {
              const day = s.workout_days
              const color = s.color || day?.color || '#2563EB'
              const setsLogged = (s.session_sets || []).filter(st => st.done).length
              return (
                <button
                  key={s.id}
                  onClick={() => onEditSession(s)}
                  style={{ textAlign: 'left', background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: 'none', borderLeft: `3px solid ${color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', cursor: 'pointer' }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name || day?.name || 'Workout'}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                      {daysAgo(s.started_at)} · {setsLogged} sets{s.duration_mins ? ` · ${s.duration_mins}min` : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2563EB' }}>Edit</div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatProps {
  value: string
  label: string
  highlight?: boolean
}

function Stat({ value, label, highlight }: StatProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: highlight ? '#FCD34D' : '#E2E8F0' }}>{value}</div>
      <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>{label.toUpperCase()}</div>
    </div>
  )
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: 2, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>{children}</div>
}

export function EmptyCard({ text }: { text: string }) {
  return <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>{text}</div>
}
