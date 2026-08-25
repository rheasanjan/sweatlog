import type { Activity, BodyLogEntry } from '../types'

export type ProgressRange = '7d' | '30d' | 'all'

export interface DateWindow {
  start: string | null
  end: string
}

export interface ProgressStats {
  sessionCount: number
  sessionDelta: number | null
  sessionFooter: string | null
  latestWeight: number | null
  weightChange: number | null
  currentWeightFooter: string | null
  weightFooter: string | null
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(dateKey: string, days: number): string {
  const next = new Date(`${dateKey}T12:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return toDateKey(next)
}

export function rangeWindows(range: ProgressRange, now: Date): {
  current: DateWindow
  previous: DateWindow | null
} {
  const end = toDateKey(now)
  if (range === 'all') {
    return { current: { start: null, end }, previous: null }
  }

  const days = range === '7d' ? 7 : 30
  const start = addDays(end, -(days - 1))
  const previousEnd = addDays(start, -1)
  const previousStart = addDays(previousEnd, -(days - 1))
  return {
    current: { start, end },
    previous: { start: previousStart, end: previousEnd },
  }
}

export function inWindow(dateKey: string, window: DateWindow): boolean {
  if (dateKey > window.end) return false
  if (window.start && dateKey < window.start) return false
  return true
}

export function filterPointsInRange<T extends { date: string }>(
  points: T[],
  window: DateWindow,
): T[] {
  return points.filter(point => inWindow(point.date.slice(0, 10), window))
}

function activityDate(activity: Activity): string {
  return activity.started_at.slice(0, 10)
}

function countCompleted(sessions: Activity[], window: DateWindow): number {
  return sessions.filter(session => (
    session.status === 'completed' && inWindow(activityDate(session), window)
  )).length
}

function weightsInWindow(bodyLog: BodyLogEntry[], window: DateWindow): number[] {
  return [...bodyLog]
    .filter(entry => entry.weight_kg != null && inWindow(entry.date.slice(0, 10), window))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(entry => Number.parseFloat(String(entry.weight_kg)))
}

function round1(value: number): number {
  return Number(value.toFixed(1))
}

function isSteady(change: number | null): boolean {
  return change != null && Math.abs(change) < 0.05
}

function vsLabel(range: ProgressRange): string {
  return range === '7d' ? 'vs last 7d' : 'vs last mo'
}

function sessionFooter(range: ProgressRange, delta: number | null): string | null {
  if (delta == null) return null
  if (delta > 0) return `▲ ${delta} ${vsLabel(range)}`
  if (delta < 0) return `▼ ${Math.abs(delta)} ${vsLabel(range)}`
  return `— even ${vsLabel(range)}`
}

function weightTrendFooter(change: number | null): string | null {
  if (change == null) return null
  if (isSteady(change)) return '— steady'
  if (change < 0) return '▲ trending down'
  return '▼ trending up'
}

export function buildProgressStats(input: {
  sessions: Activity[]
  bodyLog: BodyLogEntry[]
  range: ProgressRange
  now: Date
}): ProgressStats {
  const { current, previous } = rangeWindows(input.range, input.now)
  const sessionCount = countCompleted(input.sessions, current)
  const previousCount = previous ? countCompleted(input.sessions, previous) : null
  const sessionDelta = previousCount == null ? null : sessionCount - previousCount
  const weights = weightsInWindow(input.bodyLog, current)
  const latestWeight = weights.length ? weights[weights.length - 1] : null
  const weightChange = weights.length >= 2 ? round1(latestWeight! - weights[0]) : null
  const hideComparisons = input.range === 'all'
  const trend = hideComparisons ? null : weightTrendFooter(weightChange)

  return {
    sessionCount,
    sessionDelta,
    sessionFooter: hideComparisons ? null : sessionFooter(input.range, sessionDelta),
    latestWeight,
    weightChange,
    currentWeightFooter: hideComparisons || !isSteady(weightChange) ? null : '— steady',
    weightFooter: trend,
  }
}
