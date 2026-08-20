import type { ActivityCategory } from '../types'
import { categoryTheme } from '../styles/theme'

export interface ActivityTypeOption {
  id: string
  label: string
  color: string
  icon: ActivityIcon
}

export interface ActivityCategoryOption {
  id: ActivityCategory
  label: string
  color: string
  softColor: string
  icon: ActivityIcon
}

export type ActivityIcon =
  | 'dumbbell'
  | 'heart-pulse'
  | 'trophy'
  | 'person-standing'
  | 'footprints'
  | 'mountain'
  | 'bike'
  | 'waves'
  | 'music'
  | 'circle-plus'
  | 'activity'

export const ACTIVITY_CATEGORIES: ActivityCategoryOption[] = [
  { id: 'strength', label: 'Strength', ...categoryTheme.strength, icon: 'dumbbell' },
  { id: 'cardio', label: 'Cardio', ...categoryTheme.cardio, icon: 'heart-pulse' },
  { id: 'sport', label: 'Sport', ...categoryTheme.sport, icon: 'trophy' },
  { id: 'mobility', label: 'Mobility', ...categoryTheme.mobility, icon: 'person-standing' },
]

const CARDIO_TYPES: ActivityTypeOption[] = [
  { id: 'run', label: 'Run', color: categoryTheme.cardio.color, icon: 'footprints' },
  { id: 'walk', label: 'Walk', color: categoryTheme.cardio.color, icon: 'footprints' },
  { id: 'incline_walk', label: 'Incline Walk', color: categoryTheme.cardio.color, icon: 'mountain' },
  { id: 'cycling', label: 'Cycling', color: categoryTheme.cardio.color, icon: 'bike' },
  { id: 'rowing', label: 'Rowing', color: categoryTheme.cardio.color, icon: 'waves' },
  { id: 'zumba_dance', label: 'Zumba / Dance', color: categoryTheme.cardio.color, icon: 'music' },
  { id: 'other', label: 'Other', color: categoryTheme.cardio.color, icon: 'circle-plus' },
]

const SPORT_TYPES: ActivityTypeOption[] = [
  { id: 'pickleball', label: 'Pickleball', color: categoryTheme.sport.color, icon: 'trophy' },
  { id: 'other_sport', label: 'Other Sport', color: categoryTheme.sport.color, icon: 'circle-plus' },
]

const MOBILITY_TYPES: ActivityTypeOption[] = [
  { id: 'mobility', label: 'Mobility', color: categoryTheme.mobility.color, icon: 'activity' },
  { id: 'stretching', label: 'Stretching', color: categoryTheme.mobility.color, icon: 'person-standing' },
  { id: 'yoga', label: 'Yoga', color: categoryTheme.mobility.color, icon: 'person-standing' },
  { id: 'recovery', label: 'Recovery', color: categoryTheme.mobility.color, icon: 'heart-pulse' },
  { id: 'other', label: 'Other', color: categoryTheme.mobility.color, icon: 'circle-plus' },
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
