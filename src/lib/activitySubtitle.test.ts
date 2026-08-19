import { describe, expect, it } from 'vitest'
import { formatActivitySubtitle } from './activitySubtitle'
import type { Activity } from '../types'

function activity(partial: Partial<Activity> & Pick<Activity, 'id' | 'category' | 'name'>): Activity {
  return {
    color: '#2563EB',
    workout_day_id: null,
    status: 'completed',
    started_at: '2026-08-17T12:00:00.000Z',
    finished_at: '2026-08-17T12:40:00.000Z',
    duration_mins: null,
    note: null,
    details: {},
    session_sets: [],
    ...partial,
  }
}

describe('formatActivitySubtitle', () => {
  it('formats strength with sets and duration', () => {
    const a = activity({
      id: 's1',
      category: 'strength',
      name: 'Push',
      duration_mins: 45,
      session_sets: [
        {
          exercise_id: 'e1',
          exercise_name: 'Bench',
          alt_used: false,
          set_number: 1,
          weight_kg: 60,
          reps: 8,
          duration_secs: null,
          done: true,
        },
        {
          exercise_id: 'e1',
          exercise_name: 'Bench',
          alt_used: false,
          set_number: 2,
          weight_kg: 60,
          reps: 8,
          duration_secs: null,
          done: true,
        },
      ],
    })
    expect(formatActivitySubtitle(a, { relativeDate: 'Today' })).toBe('Today · 2 sets · 45 min')
  })

  it('formats run with distance', () => {
    const a = activity({
      id: 'r1',
      category: 'cardio',
      name: 'Run',
      duration_mins: 18,
      details: { distance_km: 2.1 },
    })
    expect(formatActivitySubtitle(a, { relativeDate: 'Yesterday' })).toBe('Yesterday · 18 min · 2.1 km')
  })

  it('formats pickleball with duration only', () => {
    const a = activity({
      id: 'p1',
      category: 'sport',
      name: 'Pickleball',
      duration_mins: 75,
    })
    expect(formatActivitySubtitle(a, { relativeDate: '2 days ago' })).toBe('2 days ago · 75 min')
  })

  it('formats incline walk with speed and incline', () => {
    const a = activity({
      id: 'w1',
      category: 'cardio',
      name: 'Incline Walk',
      duration_mins: 30,
      details: { speed_kmh: 5.5, incline_pct: 8 },
    })
    expect(formatActivitySubtitle(a, { relativeDate: 'Today' })).toBe(
      'Today · 30 min · 5.5 km/h · 8% incline',
    )
  })

  it('omits missing optionals without trailing separators', () => {
    const a = activity({
      id: 'm1',
      category: 'mobility',
      name: 'Yoga',
      duration_mins: null,
    })
    expect(formatActivitySubtitle(a, { relativeDate: 'Today' })).toBe('Today')
  })
})
