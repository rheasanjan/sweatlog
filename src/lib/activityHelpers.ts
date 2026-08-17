import type { Activity } from '../types'

export function formatTotalDuration(totalMins: number): string {
  const mins = Math.max(0, Math.round(totalMins) || 0)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function sumDurationMins(
  activities: Array<{ duration_mins: number | null | undefined }>,
): number {
  return activities.reduce((sum, a) => sum + (Number(a.duration_mins) || 0), 0)
}

export function getInProgressForTemplate(
  activities: Activity[] | null | undefined,
  templateId: string,
): Activity | null {
  const matches = (activities || [])
    .filter(a => a.workout_day_id === templateId && a.status === 'in_progress')
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  return matches[0] || null
}
