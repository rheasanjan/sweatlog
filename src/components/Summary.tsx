import { Check } from 'lucide-react'
import type { FinishedSession, SessionSet, WorkoutDay } from '../types'

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

export default function Summary({ session, onDone }: SummaryProps) {
  const day = session.workout_days || session.workoutDay
  const color = day?.color || '#2563EB'
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
    <div>
      <div style={{ background: color, padding: '32px 20px 28px', textAlign: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <Check size={30} color="#fff" strokeWidth={3} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{day?.name || 'Workout'} Complete</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          {session.duration_mins ? `${session.duration_mins} minutes` : 'Session saved'}
        </div>
      </div>

      <div style={{ padding: '20px 16px 100px' }}>
        {prs.length > 0 && (
          <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 6 }}>🏆 NEW PERSONAL RECORDS</div>
            {prs.map((pr, i) => (
              <div key={i} style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
                {pr.exercise_name}
                {pr.duration_secs ? ` — ${pr.duration_secs}s` : pr.weight_kg ? ` — ${pr.weight_kg}kg` : ''}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, letterSpacing: 2, color: '#94A3B8', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>What you logged</div>

        {Object.keys(byExercise).length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 12, padding: 20, textAlign: 'center', color: '#94A3B8', fontSize: 13, marginBottom: 16 }}>No sets were marked done.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {Object.entries(byExercise).map(([name, exSets]) => (
              <div key={name} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${color}` }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
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
            ))}
          </div>
        )}

        <button
          onClick={onDone}
          style={{ width: '100%', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 14, padding: '16px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
