import { describe, expect, it } from 'vitest'
import {
  buildProgressStats,
  filterPointsInRange,
  rangeWindows,
  type ProgressRange,
} from './progressRange'
import type { Activity, BodyLogEntry } from '../types'

const now = new Date('2026-08-24T12:00:00.000Z')

function session(id: string, startedAt: string, status = 'completed'): Activity {
  return {
    id,
    category: 'strength',
    name: 'Push',
    color: '#6C4FFF',
    workout_day_id: 't1',
    status,
    started_at: startedAt,
    finished_at: status === 'completed' ? startedAt : null,
    duration_mins: 45,
    note: null,
  }
}

function body(date: string, weight: number): BodyLogEntry {
  return { date, weight_kg: weight, waist_cm: null, energy: null, note: null }
}

describe('rangeWindows', () => {
  it('uses inclusive last 30 days and a matching previous window', () => {
    const { current, previous } = rangeWindows('30d', now)
    expect(current).toEqual({ start: '2026-07-26', end: '2026-08-24' })
    expect(previous).toEqual({ start: '2026-06-26', end: '2026-07-25' })
  })

  it('returns no previous window for all-time', () => {
    const { current, previous } = rangeWindows('all', now)
    expect(current).toEqual({ start: null, end: '2026-08-24' })
    expect(previous).toBeNull()
  })
})

describe('buildProgressStats', () => {
  const sessions = [
    session('a', '2026-08-20T12:00:00.000Z'),
    session('b', '2026-08-10T12:00:00.000Z'),
    session('c', '2026-07-20T12:00:00.000Z'),
    session('d', '2026-07-01T12:00:00.000Z'),
    session('open', '2026-08-23T12:00:00.000Z', 'in_progress'),
  ]
  const logs = [
    body('2026-07-01', 66.0),
    body('2026-08-01', 65.8),
    body('2026-08-20', 65.5),
  ]

  it('counts completed sessions in range and compares to the previous window', () => {
    const stats = buildProgressStats({ sessions, bodyLog: logs, range: '30d', now })
    expect(stats.sessionCount).toBe(2)
    expect(stats.sessionDelta).toBe(0)
    expect(stats.sessionFooter).toBe('— even vs last mo')
    expect(stats.latestWeight).toBe(65.5)
    expect(stats.weightChange).toBe(-0.3)
    expect(stats.weightFooter).toBe('▲ trending down')
    expect(stats.currentWeightFooter).toBeNull()
  })

  it('hides comparisons on all-time', () => {
    const stats = buildProgressStats({ sessions, bodyLog: logs, range: 'all', now })
    expect(stats.sessionCount).toBe(4)
    expect(stats.sessionFooter).toBeNull()
    expect(stats.weightFooter).toBeNull()
    expect(stats.currentWeightFooter).toBeNull()
    expect(stats.latestWeight).toBe(65.5)
    expect(stats.weightChange).toBe(-0.5)
  })

  it('labels a 7-day comparison against the previous week', () => {
    const stats = buildProgressStats({
      sessions: [
        session('a', '2026-08-24T12:00:00.000Z'),
        session('b', '2026-08-23T12:00:00.000Z'),
        session('c', '2026-08-16T12:00:00.000Z'),
      ],
      bodyLog: [body('2026-08-18', 65.5), body('2026-08-24', 65.5)],
      range: '7d',
      now,
    })
    expect(stats.sessionCount).toBe(2)
    expect(stats.sessionDelta).toBe(1)
    expect(stats.sessionFooter).toBe('▲ 1 vs last 7d')
    expect(stats.currentWeightFooter).toBe('— steady')
    expect(stats.weightFooter).toBe('— steady')
    expect(stats.weightChange).toBe(0)
  })
})

describe('filterPointsInRange', () => {
  it('keeps points on the inclusive window', () => {
    const range: ProgressRange = '30d'
    const { current } = rangeWindows(range, now)
    const points = filterPointsInRange(
      [
        { date: '2026-07-25', weight: 66 },
        { date: '2026-07-26', weight: 65.9 },
        { date: '2026-08-24', weight: 65.5 },
      ],
      current,
    )
    expect(points.map(p => p.date)).toEqual(['2026-07-26', '2026-08-24'])
  })
})
