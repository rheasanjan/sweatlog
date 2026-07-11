import { describe, expect, it } from 'vitest'
import { weekStartKey } from './program'
import {
  buildWeeklySummary,
  formatImprovementDelta,
  isBetterSet,
  weeklySummaryCopy,
} from './weeklySummary'
import type { Session, SessionSet, WorkoutDay, WorkoutSkip } from '../types'

function set(partial: Partial<SessionSet> & Pick<SessionSet, 'exercise_id' | 'exercise_name'>): SessionSet {
  return {
    set_number: 1,
    weight_kg: null,
    reps: null,
    duration_secs: null,
    done: true,
    alt_used: false,
    ...partial,
  }
}

function session(partial: Partial<Session> & Pick<Session, 'id' | 'workout_day_id' | 'started_at'>): Session {
  return {
    status: 'finished',
    finished_at: partial.started_at,
    duration_mins: 40,
    note: null,
    session_sets: [],
    ...partial,
  }
}

const days: WorkoutDay[] = [
  { id: 'd1', name: 'Push', slug: 'push', color: '#2563EB', subtitle: null, sort_order: 1, is_custom: false },
  { id: 'd2', name: 'Pull', slug: 'pull', color: '#7C3AED', subtitle: null, sort_order: 2, is_custom: false },
  { id: 'd3', name: 'Legs', slug: 'legs', color: '#DC2626', subtitle: null, sort_order: 3, is_custom: false },
]

/** Monday 6 Jul 2026 local noon-ish ISO used as week start reference. */
const weekMonday = new Date('2026-07-06T12:00:00')

describe('isBetterSet / formatImprovementDelta', () => {
  it('prefers heavier weight, then more reps', () => {
    const light = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 60, reps: 8 })
    const heavy = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 62.5, reps: 5 })
    const sameWeightMoreReps = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 60, reps: 10 })
    expect(isBetterSet(heavy, light)).toBe(true)
    expect(isBetterSet(sameWeightMoreReps, light)).toBe(true)
    expect(isBetterSet(light, heavy)).toBe(false)
  })

  it('formats weight and rep deltas', () => {
    const current = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 62.5, reps: 5 })
    const prior = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 60, reps: 8 })
    expect(formatImprovementDelta(current, prior)).toBe('+2.5kg')
    const sameW = set({ exercise_id: 'e1', exercise_name: 'Bench', weight_kg: 60, reps: 10 })
    expect(formatImprovementDelta(sameW, prior)).toBe('+2 reps')
  })

  it('formats timed deltas', () => {
    const current = set({ exercise_id: 'e2', exercise_name: 'Hang', duration_secs: 45 })
    const prior = set({ exercise_id: 'e2', exercise_name: 'Hang', duration_secs: 30 })
    expect(formatImprovementDelta(current, prior)).toBe('+15s')
  })
})

describe('weeklySummaryCopy', () => {
  it('handles empty, sparse, and rich states', () => {
    expect(weeklySummaryCopy({ doneCount: 0, dayCount: 5, weekComplete: false, prCount: 0 })).toEqual({
      headline: '0 of 5 sessions in.',
      subline: 'Log a session to start the week.',
      rich: false,
    })
    expect(weeklySummaryCopy({ doneCount: 2, dayCount: 5, weekComplete: false, prCount: 0 }).headline)
      .toBe('2 of 5 sessions in.')
    expect(weeklySummaryCopy({ doneCount: 4, dayCount: 5, weekComplete: false, prCount: 2 }).headline)
      .toBe('Strong week — 4/5 in, all-time bests set.')
  })
})

describe('buildWeeklySummary', () => {
  it('returns empty sparse state with no sessions', () => {
    const summary = buildWeeklySummary({
      sessions: [],
      workoutDays: days,
      weekSkips: [],
      weekMonday,
    })
    expect(summary.doneCount).toBe(0)
    expect(summary.prs).toEqual([])
    expect(summary.weekOverWeekBeats).toEqual([])
    expect(summary.rich).toBe(false)
    expect(summary.headline).toBe('0 of 3 sessions in.')
  })

  it('detects all-time PRs and excludes them from week-over-week beats', () => {
    const prior = session({
      id: 's0',
      workout_day_id: 'd1',
      started_at: '2026-06-29T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'bench', exercise_name: 'Bench Press', weight_kg: 60, reps: 8 }),
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 100, reps: 5 }),
      ],
    })
    const lastWeek = session({
      id: 's1',
      workout_day_id: 'd1',
      started_at: '2026-06-30T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'bench', exercise_name: 'Bench Press', weight_kg: 60, reps: 8 }),
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 100, reps: 5 }),
        set({ exercise_id: 'curl', exercise_name: 'Curl', weight_kg: 12, reps: 10 }),
      ],
    })
    const thisWeek = session({
      id: 's2',
      workout_day_id: 'd1',
      started_at: '2026-07-07T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'bench', exercise_name: 'Bench Press', weight_kg: 62.5, reps: 5 }),
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 102.5, reps: 5 }),
        set({ exercise_id: 'curl', exercise_name: 'Curl', weight_kg: 14, reps: 10 }),
      ],
    })

    const summary = buildWeeklySummary({
      sessions: [prior, lastWeek, thisWeek],
      workoutDays: days,
      weekSkips: [],
      weekMonday,
    })

    expect(summary.prs.map(p => p.exerciseName).sort()).toEqual(['Bench Press', 'Curl', 'Squat'])
    expect(summary.prs.find(p => p.exerciseName === 'Bench Press')?.deltaLabel).toBe('+2.5kg')
    // All three are PRs (beat prior), so beats footer stays empty even though they also beat last week
    expect(summary.weekOverWeekBeats).toEqual([])
    expect(summary.rich).toBe(true)
  })

  it('lists week-over-week beats that are not all-time PRs', () => {
    const history = session({
      id: 's0',
      workout_day_id: 'd1',
      started_at: '2026-06-15T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 120, reps: 5 }),
        set({ exercise_id: 'curl', exercise_name: 'Curl', weight_kg: 20, reps: 10 }),
      ],
    })
    const lastWeek = session({
      id: 's1',
      workout_day_id: 'd2',
      started_at: '2026-06-30T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 100, reps: 5 }),
        set({ exercise_id: 'curl', exercise_name: 'Curl', weight_kg: 12, reps: 10 }),
      ],
    })
    const thisWeek = session({
      id: 's2',
      workout_day_id: 'd1',
      started_at: '2026-07-08T12:00:00.000Z',
      session_sets: [
        set({ exercise_id: 'squat', exercise_name: 'Squat', weight_kg: 105, reps: 5 }),
        set({ exercise_id: 'curl', exercise_name: 'Curl', weight_kg: 14, reps: 10 }),
      ],
    })

    const summary = buildWeeklySummary({
      sessions: [history, lastWeek, thisWeek],
      workoutDays: days,
      weekSkips: [],
      weekMonday,
    })

    expect(summary.prs).toEqual([])
    expect(summary.weekOverWeekBeats).toEqual(['Curl', 'Squat'])
    expect(summary.rich).toBe(false)
  })

  it('marks week complete when done + skipped cover all days', () => {
    const sessions = days.map((d, i) =>
      session({
        id: `s${i}`,
        workout_day_id: d.id,
        started_at: `2026-07-0${7 + i}T12:00:00.000Z`,
        session_sets: [set({ exercise_id: `e${i}`, exercise_name: `Ex ${i}`, weight_kg: 40, reps: 8 })],
      })
    )
    // Only 2 sessions; skip the third day
    const skips: WorkoutSkip[] = [
      { id: 'sk1', workout_day_id: 'd3', week_start: weekStartKey(weekMonday), note: null },
    ]
    const summary = buildWeeklySummary({
      sessions: sessions.slice(0, 2),
      workoutDays: days,
      weekSkips: skips,
      weekMonday,
    })
    expect(summary.doneCount).toBe(2)
    expect(summary.weekComplete).toBe(true)
    expect(summary.subline).toContain('Week complete')
  })

  it('computes streak from consecutive complete weeks', () => {
    const makeCompleteWeek = (mondayIso: string, prefix: string): Session[] =>
      days.map((d, i) =>
        session({
          id: `${prefix}-${i}`,
          workout_day_id: d.id,
          started_at: new Date(new Date(mondayIso).getTime() + i * 86400000).toISOString(),
          session_sets: [set({ exercise_id: `${prefix}-e`, exercise_name: 'Ex', weight_kg: 50, reps: 8 })],
        })
      )

    const sessions = [
      ...makeCompleteWeek('2026-06-22T12:00:00', 'w1'),
      ...makeCompleteWeek('2026-06-29T12:00:00', 'w2'),
      ...makeCompleteWeek('2026-07-06T12:00:00', 'w3'),
    ]

    const summary = buildWeeklySummary({
      sessions,
      workoutDays: days,
      weekSkips: [],
      weekMonday,
    })
    expect(summary.streak).toBe(3)
    expect(summary.weekComplete).toBe(true)
  })
})
