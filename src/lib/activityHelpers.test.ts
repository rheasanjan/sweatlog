import { describe, expect, it } from 'vitest'
import { formatTotalDuration, sumDurationMins, getInProgressForTemplate } from './activityHelpers'
import type { Activity } from '../types'

describe('formatTotalDuration', () => {
  it('formats zero, minutes, hours, and mixed', () => {
    expect(formatTotalDuration(0)).toBe('0m')
    expect(formatTotalDuration(45)).toBe('45m')
    expect(formatTotalDuration(120)).toBe('2h')
    expect(formatTotalDuration(125)).toBe('2h 5m')
  })
})

describe('sumDurationMins', () => {
  it('sums durations treating null as 0', () => {
    expect(sumDurationMins([
      { duration_mins: 40 },
      { duration_mins: null },
      { duration_mins: 25 },
    ])).toBe(65)
  })
})

describe('getInProgressForTemplate', () => {
  it('returns newest in_progress for template', () => {
    const activities: Activity[] = [
      {
        id: 'a1', category: 'strength', name: 'Push', color: '#2563EB',
        workout_day_id: 'd1', status: 'in_progress',
        started_at: '2026-07-07T10:00:00.000Z', finished_at: null,
        duration_mins: null, note: null,
      },
      {
        id: 'a2', category: 'strength', name: 'Push', color: '#2563EB',
        workout_day_id: 'd1', status: 'completed',
        started_at: '2026-07-07T12:00:00.000Z', finished_at: '2026-07-07T13:00:00.000Z',
        duration_mins: 60, note: null,
      },
    ]
    expect(getInProgressForTemplate(activities, 'd1')?.id).toBe('a1')
    expect(getInProgressForTemplate(activities, 'd2')).toBeNull()
  })
})
