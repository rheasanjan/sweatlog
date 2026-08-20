import { Check, Trophy } from 'lucide-react'
import type { FinishedSession, SessionSet, WorkoutDay } from '../types'
import { categoryTheme, theme } from '../styles/theme'
import { cardStyle, primaryButtonStyle, sectionTitleStyle } from '../styles/ui'

type SummarySet = SessionSet & {
  exerciseName?: string
  durationSecs?: number | null
  weightKg?: number | null
}

interface SummarySession extends FinishedSession {
  workoutDay?: Pick<WorkoutDay, 'id' | 'name' | 'slug' | 'color' | 'subtitle'>
}

export interface SummaryProps {
  session: SummarySession
  onDone: () => void
}

export default function Summary({ session, onDone }: Readonly<SummaryProps>) {
  const day = session.workout_days || session.workoutDay
  const color = categoryTheme.strength.color
  const sets = (session.session_sets || []) as SummarySet[]
  const doneSets = sets.filter(s => s.done)
  const prs = session.prs || []

  const byExercise = doneSets.reduce<Record<string, SummarySet[]>>((acc, s) => {
    const name = s.exercise_name || s.exerciseName || 'Unknown'
    if (!acc[name]) acc[name] = []
    acc[name].push(s)
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: theme.colors.background }}>
      <div style={{ background: `radial-gradient(120% 140% at 50% -10%, #342779 0%, ${theme.colors.navy} 68%)`, padding: '38px 20px 34px', textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
          <Check size={30} color="#fff" strokeWidth={3} />
        </div>
        <div style={{ fontFamily: theme.font.display, fontSize: 24, fontWeight: 800, color: theme.colors.white }}>{day?.name || 'Workout'} Complete</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          {session.duration_mins ? `${session.duration_mins} minutes` : 'Session saved'}
        </div>
      </div>

      <div style={{ padding: '20px 20px 100px' }}>
        {prs.length > 0 && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 16, padding: '14px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: theme.font.display, fontSize: 12, fontWeight: 800, color: '#D96C24', marginBottom: 8, letterSpacing: '0.05em' }}><Trophy size={15} /> NEW PERSONAL RECORDS</div>
            {prs.map((pr, i) => (
              <div key={i} style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                {pr.exercise_name}
                {pr.duration_secs ? ` — ${pr.duration_secs}s` : pr.weight_kg ? ` — ${pr.weight_kg}kg` : ''}
              </div>
            ))}
          </div>
        )}

        <div style={sectionTitleStyle}>What you logged</div>

        {Object.keys(byExercise).length === 0 ? (
          <div style={{ ...cardStyle, padding: 20, textAlign: 'center', color: theme.colors.muted, fontSize: 13, marginBottom: 16 }}>No sets were marked done.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {Object.entries(byExercise).map(([name, exSets]) => (
              <div key={name} style={{ ...cardStyle, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 9, height: 38, borderRadius: 8, background: color, flexShrink: 0 }} />
                <div>
                <div style={{ fontFamily: theme.font.display, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 12, color: theme.colors.muted }}>
                  {exSets.map(s => {
                    const duration = s.duration_secs ?? s.durationSecs
                    const weight = s.weight_kg ?? s.weightKg
                    if (duration) return `${duration}s`
                    if (weight) return `${weight}kg×${s.reps}`
                    if (s.reps) return `${s.reps}`
                    return '—'
                  }).join(' · ')}
                </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onDone}
          style={primaryButtonStyle}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
