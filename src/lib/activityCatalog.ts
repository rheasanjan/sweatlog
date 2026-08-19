import type { ActivityCategory } from '../types'

export interface ActivityTypeOption {
  id: string
  label: string
  color: string
}

export interface ActivityCategoryOption {
  id: ActivityCategory
  label: string
  color: string
}

export const ACTIVITY_CATEGORIES: ActivityCategoryOption[] = [
  { id: 'strength', label: 'Strength', color: '#2563EB' },
  { id: 'cardio', label: 'Cardio', color: '#0891B2' },
  { id: 'sport', label: 'Sport', color: '#D97706' },
  { id: 'mobility', label: 'Mobility', color: '#059669' },
]

const CARDIO_TYPES: ActivityTypeOption[] = [
  { id: 'run', label: 'Run', color: '#0891B2' },
  { id: 'walk', label: 'Walk', color: '#0891B2' },
  { id: 'incline_walk', label: 'Incline Walk', color: '#0891B2' },
  { id: 'cycling', label: 'Cycling', color: '#0891B2' },
  { id: 'rowing', label: 'Rowing', color: '#0891B2' },
  { id: 'zumba_dance', label: 'Zumba / Dance', color: '#0891B2' },
  { id: 'other', label: 'Other', color: '#0891B2' },
]

const SPORT_TYPES: ActivityTypeOption[] = [
  { id: 'pickleball', label: 'Pickleball', color: '#D97706' },
  { id: 'other_sport', label: 'Other Sport', color: '#D97706' },
]

const MOBILITY_TYPES: ActivityTypeOption[] = [
  { id: 'mobility', label: 'Mobility', color: '#059669' },
  { id: 'stretching', label: 'Stretching', color: '#059669' },
  { id: 'yoga', label: 'Yoga', color: '#059669' },
  { id: 'recovery', label: 'Recovery', color: '#059669' },
  { id: 'other', label: 'Other', color: '#059669' },
]

const TYPES_BY_CATEGORY: Record<Exclude<ActivityCategory, 'strength'>, ActivityTypeOption[]> = {
  cardio: CARDIO_TYPES,
  sport: SPORT_TYPES,
  mobility: MOBILITY_TYPES,
}

export function typesForCategory(category: ActivityCategory): ActivityTypeOption[] {
  if (category === 'strength') return []
  return TYPES_BY_CATEGORY[category]
}

export function getActivityType(
  category: ActivityCategory,
  typeId: string,
): ActivityTypeOption | null {
  return typesForCategory(category).find(t => t.id === typeId) ?? null
}
