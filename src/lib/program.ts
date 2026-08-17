import type { Session, SessionSet, SetInput } from '../types'

export const DAY_COLORS = ['#2563EB', '#7C3AED', '#DC2626', '#059669', '#D97706', '#0891B2', '#DB2777']

export const DEFAULT_SETS: Record<string, number> = {
  'Incline Dumbbell Press': 3,
  'Seated DB Shoulder Press': 3,
  'Chest Press Machine': 3,
  'Lateral Raises': 4,
  'Tricep Pushdowns': 3,
  'Cable External Rotations': 2,
  'Lat Pulldown': 3,
  'Seated Cable Row': 3,
  'Face Pulls': 3,
  'Dumbbell Curls': 3,
  'Hammer Curls': 2,
  'Dead Hang': 2,
  'Hip Thrust': 4,
  'Bulgarian Split Squat': 3,
  'Hip Abduction Machine': 3,
  'Standing Calf Raises': 4,
  'Single-Arm DB Row': 3,
  'Arnold Press': 3,
  'Overhead Tricep Extension': 3,
  'Weighted Crunches': 3,
  'Pallof Press': 3,
  'Squat or Leg Press': 4,
  'Leg Curl': 3,
  'Leg Extension': 3,
  'Single-Leg RDL': 2,
  'Tibialis Raises': 2,
  "Farmer's Carry": 3,
  'Plank': 1,
  'Dead Bug': 3,
  'Hanging Knee Raise': 3,
  'Russian Twist': 3,
  'Side Plank': 2,
  'Cable Woodchop': 3,
  'Single-Leg Glute Bridge': 2,
  'Clamshells': 2,
  'Monster Walks': 2,
  'Copenhagen Plank': 2,
  'Box Jumps': 3,
  'Broad Jump': 3,
  'Jump Squats': 3,
  'Med Ball Slam': 3,
}

export const DEFAULT_REPS: Record<string, string> = {
  'Incline Dumbbell Press': '8–12',
  'Seated DB Shoulder Press': '8–12',
  'Chest Press Machine': '10–12',
  'Lateral Raises': '12–15',
  'Tricep Pushdowns': '10–15',
  'Cable External Rotations': '15',
  'Lat Pulldown': '8–12',
  'Seated Cable Row': '8–12',
  'Face Pulls': '12–15',
  'Dumbbell Curls': '10–15',
  'Hammer Curls': '10–15',
  'Dead Hang': '30s',
  'Hip Thrust': '8–12',
  'Bulgarian Split Squat': '8–12 ea',
  'Hip Abduction Machine': '12–15',
  'Standing Calf Raises': '12–20',
  'Single-Arm DB Row': '8–12',
  'Arnold Press': '10–12',
  'Overhead Tricep Extension': '10–15',
  'Weighted Crunches': '12–15',
  'Pallof Press': '10 ea',
  'Squat or Leg Press': '8–12',
  'Leg Curl': '10–15',
  'Leg Extension': '10–15',
  'Single-Leg RDL': '8 ea',
  'Tibialis Raises': '15',
  "Farmer's Carry": '30s',
  'Plank': '30–45s',
  'Dead Bug': '10 ea',
  'Hanging Knee Raise': '12',
  'Russian Twist': '15 ea',
  'Side Plank': '20–30s ea',
  'Cable Woodchop': '10 ea',
  'Single-Leg Glute Bridge': '12 ea',
  'Clamshells': '15 ea',
  'Monster Walks': '10 ea',
  'Copenhagen Plank': '20–30s ea',
  'Box Jumps': '5',
  'Broad Jump': '5',
  'Jump Squats': '8',
  'Med Ball Slam': '10',
}

export function isTimed(repStr = ''): boolean {
  return repStr.includes('s')
}

export function startOfWeek(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export function weekStartKey(date: Date = new Date()): string {
  return startOfWeek(date).toISOString().slice(0, 10)
}

export function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

export function formatWeekRange(monday: Date): string {
  const start = new Date(monday)
  const end = new Date(monday)
  end.setDate(start.getDate() + 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  return `${start.toLocaleDateString('en-GB', opts)} – ${end.toLocaleDateString('en-GB', opts)}`
}

export function formatSessionDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

export function toDateInputValue(date: Date = new Date()): string {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateAtNoon(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toISOString()
}

export function isSameDay(a: Date, b: Date): boolean {
  return toDateInputValue(a) === toDateInputValue(b)
}

export function weekDateBounds(weekMonday: Date): { start: Date; end: Date } {
  const start = new Date(weekMonday)
  start.setHours(0, 0, 0, 0)
  const end = new Date(weekMonday)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  const today = new Date()
  return { start, end: end < today ? end : today }
}

export function defaultLogDateForWeek(weekMonday: Date): string {
  const { end } = weekDateBounds(weekMonday)
  return toDateInputValue(end)
}

export function getSessionForWeek(
  sessions: Session[] | null | undefined,
  workoutDayId: string,
  logDate: Date,
): Session | null {
  const weekKey = weekStartKey(logDate)
  return (sessions || [])
    .filter(s =>
      s.workout_day_id === workoutDayId &&
      s.finished_at &&
      weekStartKey(new Date(s.started_at)) === weekKey
    )
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0] || null
}

export function sessionsInWeek(sessions: Session[] | null | undefined, weekMonday: Date): Session[] {
  const weekKey = weekStartKey(weekMonday)
  return (sessions || []).filter(s => weekStartKey(new Date(s.started_at)) === weekKey)
}

export function isCurrentWeek(date: Date): boolean {
  return weekStartKey(date) === weekStartKey()
}

export function getPreviousWeekSession(
  sessions: Session[] | null | undefined,
  workoutDayId: string,
  logDate: Date,
): Session | null {
  const weekStart = startOfWeek(logDate)
  return getSessionForWeek(sessions, workoutDayId, addWeeks(weekStart, -1))
}

export function bestSetForExercise(
  session: Session | null | undefined,
  exerciseId: string,
): SessionSet | null {
  const all = (session?.session_sets || []).filter(s => s.exercise_id === exerciseId && s.done)
  if (!all.length) return null

  const weighted = all.filter(s => s.weight_kg != null)
  if (weighted.length) {
    return weighted.reduce((a, b) => {
      const aw = Number(a.weight_kg) || 0
      const bw = Number(b.weight_kg) || 0
      if (bw > aw) return b
      if (bw === aw && (Number(b.reps) || 0) > (Number(a.reps) || 0)) return b
      return a
    })
  }

  const timed = all.filter(s => s.duration_secs != null)
  if (!timed.length) return null
  return timed.reduce((a, b) =>
    (Number(a.duration_secs) || 0) >= (Number(b.duration_secs) || 0) ? a : b
  )
}

export function formatBestSetLabel(best: SessionSet | null, timed = false): string | null {
  if (!best) return null
  if (timed || (best.duration_secs != null && best.weight_kg == null)) {
    return `${best.duration_secs}s`
  }
  if (best.weight_kg != null) return `${best.weight_kg}kg × ${best.reps}`
  if (best.reps != null) return `${best.reps} reps`
  return null
}

export function setRepeatCount(set: Pick<SetInput, 'repeat'>): number {
  return Math.max(1, parseInt(set.repeat ?? '', 10) || 1)
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function lightColor(hex: string): string {
  const map: Record<string, string> = {
    '#2563EB': '#EFF6FF',
    '#7C3AED': '#F5F3FF',
    '#DC2626': '#FEF2F2',
    '#059669': '#ECFDF5',
    '#D97706': '#FFFBEB',
    '#0891B2': '#ECFEFF',
    '#DB2777': '#FDF2F8',
  }
  return map[hex] || '#F1F5F9'
}
