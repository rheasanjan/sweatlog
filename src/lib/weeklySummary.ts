import {
  addWeeks,
  computeStreak,
  sessionsInWeek,
  weekStartKey,
} from './program'
import type { Session, SessionSet, WorkoutDay, WorkoutSkip } from '../types'

export interface WeeklyPrWin {
  exerciseId: string
  exerciseName: string
  deltaLabel: string
}

export interface WeeklySummary {
  doneCount: number
  dayCount: number
  weekComplete: boolean
  streak: number
  prs: WeeklyPrWin[]
  weekOverWeekBeats: string[]
  headline: string
  subline: string
  rich: boolean
}

interface ExerciseBest {
  exerciseId: string
  exerciseName: string
  set: SessionSet
}

function isTimed(set: SessionSet): boolean {
  return set.duration_secs != null && set.weight_kg == null
}

/** True if `a` is strictly better than `b` (or `b` is missing). */
export function isBetterSet(a: SessionSet, b: SessionSet | null | undefined): boolean {
  if (!b) return true
  if (isTimed(a) || isTimed(b)) {
    return (Number(a.duration_secs) || 0) > (Number(b.duration_secs) || 0)
  }
  const aw = Number(a.weight_kg) || 0
  const bw = Number(b.weight_kg) || 0
  if (aw !== bw) return aw > bw
  return (Number(a.reps) || 0) > (Number(b.reps) || 0)
}

export function formatImprovementDelta(current: SessionSet, baseline: SessionSet | null): string {
  if (isTimed(current)) {
    const prev = Number(baseline?.duration_secs) || 0
    return `+${(Number(current.duration_secs) || 0) - prev}s`
  }
  const cw = Number(current.weight_kg) || 0
  const bw = Number(baseline?.weight_kg) || 0
  if (cw > bw) {
    const d = cw - bw
    const label = Number.isInteger(d) ? String(d) : d.toFixed(1)
    return `+${label}kg`
  }
  const cr = Number(current.reps) || 0
  const br = Number(baseline?.reps) || 0
  return `+${cr - br} reps`
}

function bestsByExercise(sessions: Session[]): Map<string, ExerciseBest> {
  const map = new Map<string, ExerciseBest>()
  for (const session of sessions) {
    for (const set of session.session_sets || []) {
      if (!set.done || !set.exercise_id) continue
      const existing = map.get(set.exercise_id)
      if (!existing || isBetterSet(set, existing.set)) {
        map.set(set.exercise_id, {
          exerciseId: set.exercise_id,
          exerciseName: set.exercise_name || existing?.exerciseName || 'Exercise',
          set,
        })
      }
    }
  }
  return map
}

function sessionsBeforeWeek(sessions: Session[], weekMonday: Date): Session[] {
  const weekKey = weekStartKey(weekMonday)
  return sessions.filter(s => weekStartKey(new Date(s.started_at)) < weekKey)
}

export function weeklySummaryCopy(input: {
  doneCount: number
  dayCount: number
  weekComplete: boolean
  prCount: number
}): { headline: string; subline: string; rich: boolean } {
  const { doneCount, dayCount, weekComplete, prCount } = input
  const remaining = Math.max(0, dayCount - doneCount)
  const rich = prCount > 0

  if (doneCount === 0) {
    return {
      headline: `0 of ${dayCount} sessions in.`,
      subline: 'Log a session to start the week.',
      rich: false,
    }
  }

  if (rich) {
    return {
      headline: `Strong week — ${doneCount}/${dayCount} in, all-time bests set.`,
      subline: weekComplete
        ? 'Week complete · every programmed day trained.'
        : `${remaining} more to go — keep building.`,
      rich: true,
    }
  }

  return {
    headline: `${doneCount} of ${dayCount} sessions in.`,
    subline: weekComplete
      ? 'Week complete · every programmed day trained.'
      : `${remaining} more to go — on track for a complete week.`,
    rich: false,
  }
}

export function buildWeeklySummary(input: {
  sessions: Session[]
  workoutDays: WorkoutDay[]
  weekSkips: WorkoutSkip[]
  weekMonday: Date
}): WeeklySummary {
  const { sessions, workoutDays, weekSkips, weekMonday } = input
  const dayCount = workoutDays.length
  const weekKey = weekStartKey(weekMonday)
  const thisWeekSessions = sessionsInWeek(sessions, weekMonday)
  const lastWeekSessions = sessionsInWeek(sessions, addWeeks(weekMonday, -1))
  const priorSessions = sessionsBeforeWeek(sessions, weekMonday)

  const doneIds = new Set(thisWeekSessions.map(s => s.workout_day_id))
  const skipIds = new Set(
    (weekSkips || []).filter(s => s.week_start === weekKey).map(s => s.workout_day_id)
  )
  const doneCount = doneIds.size
  const accounted = new Set([...doneIds, ...skipIds])
  const weekComplete = dayCount > 0 && accounted.size >= dayCount
  const streak = computeStreak(sessions, dayCount)

  const thisWeekBests = bestsByExercise(thisWeekSessions)
  const priorBests = bestsByExercise(priorSessions)
  const lastWeekBests = bestsByExercise(lastWeekSessions)

  const prs: WeeklyPrWin[] = []
  const weekOverWeekBeats: string[] = []

  for (const [exerciseId, best] of thisWeekBests) {
    const prior = priorBests.get(exerciseId)?.set ?? null
    const lastWeek = lastWeekBests.get(exerciseId)?.set ?? null

    if (isBetterSet(best.set, prior)) {
      prs.push({
        exerciseId,
        exerciseName: best.exerciseName,
        deltaLabel: formatImprovementDelta(best.set, prior),
      })
    } else if (lastWeek && isBetterSet(best.set, lastWeek)) {
      weekOverWeekBeats.push(best.exerciseName)
    }
  }

  prs.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))
  weekOverWeekBeats.sort((a, b) => a.localeCompare(b))

  const copy = weeklySummaryCopy({
    doneCount,
    dayCount,
    weekComplete,
    prCount: prs.length,
  })

  return {
    doneCount,
    dayCount,
    weekComplete,
    streak,
    prs,
    weekOverWeekBeats,
    headline: copy.headline,
    subline: copy.subline,
    rich: copy.rich,
  }
}
