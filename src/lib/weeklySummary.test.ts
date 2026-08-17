import { describe, expect, it } from 'vitest'
import {
  buildWeeklySummary,
  formatImprovementDelta,
  isBetterSet,
  weeklySummaryCopy,
} from './weeklySummary'
import type { Activity, SessionSet } from '../types'

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

function session(
  partial: Partial<Activity> & Pick<Activity, 'id' | 'workout_day_id' | 'started_at'>,
): Activity {
  return {
    category: 'strength',
    name: 'Push',
    color: '#2563EB',
    status: 'completed',
    finished_at: partial.started_at,
    duration_mins: 40,
    note: null,
    session_sets: [],
    ...partial,
  }
}

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
    expect(weeklySummaryCopy({ sessionCount: 0, totalMins: 0, prCount: 0 })).toEqual({
      headline: '0 sessions · 0m',
      subline: 'Log a session to start the week.',
      rich: false,
    })
    expect(weeklySummaryCopy({ sessionCount: 2, totalMins: 85, prCount: 0 })).toEqual({
      headline: '2 sessions · 1h 25m',
      subline: 'Keep logging what you actually did.',
      rich: false,
    })
    expect(weeklySummaryCopy({ sessionCount: 4, totalMins: 165, prCount: 2 })).toEqual({
      headline: 'Strong week — 4 sessions · 2h 45m',
      subline: 'All-time bests set this week.',
      rich: true,
    })
  })
})

describe('buildWeeklySummary', () => {
  it('returns empty state with no sessions', () => {
    const summary = buildWeeklySummary({ sessions: [], weekMonday })
    expect(summary.sessionCount).toBe(0)
    expect(summary.totalMins).toBe(0)
    expect(summary.prs).toEqual([])
    expect(summary.headline).toBe('0 sessions · 0m')
  })

  it('counts multiple completed activities from the same template', () => {
    const first = session({
      id: 's1',
      workout_day_id: 'd1',
      started_at: '2026-07-07T12:00:00.000Z',
      duration_mins: 40,
    })
    const second = session({
      id: 's2',
      workout_day_id: 'd1',
      started_at: '2026-07-09T12:00:00.000Z',
      duration_mins: 25,
    })

    const summary = buildWeeklySummary({
      sessions: [first, second],
      weekMonday,
    })

    expect(summary.sessionCount).toBe(2)
    expect(summary.totalMins).toBe(65)
    expect(summary.headline).toContain('2 sessions')
    expect(summary.headline).toContain('1h 5m')
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
      weekMonday,
    })

    expect(summary.prs).toEqual([])
    expect(summary.weekOverWeekBeats).toEqual(['Curl', 'Squat'])
    expect(summary.rich).toBe(false)
  })
})
