import { describe, expect, it } from 'vitest'
import { ACTIVITY_CATEGORIES, getActivityType, typesForCategory } from './activityCatalog'

describe('activityCatalog', () => {
  it('lists four top-level categories with colors', () => {
    expect(ACTIVITY_CATEGORIES.map(c => c.id)).toEqual(['strength', 'cardio', 'sport', 'mobility'])
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'cardio')).toMatchObject({
      color: '#00A9A0',
      softColor: '#E4F7F5',
      icon: 'heart-pulse',
    })
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'sport')).toMatchObject({
      color: '#FF8A3D',
      softColor: '#FFF1E5',
      icon: 'trophy',
    })
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'mobility')).toMatchObject({
      color: '#22B573',
      softColor: '#E7F8EF',
      icon: 'person-standing',
    })
    expect(ACTIVITY_CATEGORIES.find(c => c.id === 'strength')).toMatchObject({
      color: '#6C4FFF',
      softColor: '#F1EEFF',
      icon: 'dumbbell',
    })
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
    expect(types.find(t => t.id === 'run')).toMatchObject({
      label: 'Run',
      icon: 'footprints',
    })
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
