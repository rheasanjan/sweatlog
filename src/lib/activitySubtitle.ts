import type { Activity } from '../types'

export function formatActivitySubtitle(
  activity: Activity,
  { relativeDate }: { relativeDate: string },
): string {
  const parts: string[] = [relativeDate]
  const details = activity.details || {}

  if (activity.category === 'strength') {
    const sets = (activity.session_sets || []).filter(s => s.done).length
    if (sets > 0) parts.push(`${sets} sets`)
  }

  if (activity.duration_mins != null && Number(activity.duration_mins) > 0) {
    parts.push(`${Number(activity.duration_mins)} min`)
  }

  if (activity.name === 'Run' && details.distance_km != null && details.distance_km !== '') {
    parts.push(`${details.distance_km} km`)
  }

  if (activity.name === 'Incline Walk' || activity.name === 'Walk') {
    if (details.distance_km != null && details.distance_km !== '') {
      parts.push(`${details.distance_km} km`)
    }
    if (details.speed_kmh != null && details.speed_kmh !== '') {
      parts.push(`${details.speed_kmh} km/h`)
    }
    if (details.incline_pct != null && details.incline_pct !== '') {
      parts.push(`${details.incline_pct}% incline`)
    }
  }

  if (activity.name === 'Cycling') {
    if (details.distance_km != null && details.distance_km !== '') {
      parts.push(`${details.distance_km} km`)
    }
    if (details.avg_speed_kmh != null && details.avg_speed_kmh !== '') {
      parts.push(`${details.avg_speed_kmh} km/h`)
    }
  }

  return parts.join(' · ')
}
