import { describe, expect, it } from 'vitest'
import { ACTIVITY_CATEGORIES, getActivityType, typesForCategory } from './activityCatalog'

describe('activityCatalog', () => {
  it('lists four top-level categories with colors', () => {
    expect(ACTIVITY_CATEGORIES.map(c => c.id)).toEqual(['strength', 'cardio', 'sport', 'mobility'])
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'cardio')?.color).toBe('#0891B2')
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'sport')?.color).toBe('#D97706')
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'mobility')?.color).toBe('#059669')
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'strength')?.color).toBe('#2563EB')
  })

  it('returns cardio types including Run and Incline Walk', () => {
    const types = typesForCategory('cardio')
    expect(types.map(t => t.label)).toEqual([
      'Run',
      'Walk',
      'Incline Walk',
      'Cycling',
      'Rowing',
      'Zumba / Dance',
      'Other',
    ])
    expect(types.find(t => t.id === 'run')?.label).toBe('Run')
  })

  it('returns sport types including Pickleball', () => {
    const types = typesForCategory('sport')
    expect(types.map(t => t.label)).toContain('Pickleball')
    expect(types.map(t => t.label)).toContain('Other Sport')
  })

  it('returns mobility types including Yoga', () => {
    const types = typesForCategory('mobility')
    expect(types.map(t => t.label)).toEqual([
      'Mobility',
      'Stretching',
      'Yoga',
      'Recovery',
      'Other',
    ])
  })

  it('returns empty list for strength (templates only)', () => {
    expect(typesForCategory('strength')).toEqual([])
  })

  it('looks up a type by category and id', () => {
    expect(getActivityType('cardio', 'incline_walk')?.label).toBe('Incline Walk')
    expect(getActivityType('sport', 'pickleball')?.label).toBe('Pickleball')
    expect(getActivityType('cardio', 'missing')).toBeNull()
  })
})
