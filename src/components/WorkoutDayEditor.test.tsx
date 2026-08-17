import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  addCustomExercise: vi.fn(),
  addExerciseToWorkoutDay: vi.fn(),
  deleteWorkoutDay: vi.fn(),
  removeExerciseFromWorkoutDay: vi.fn(),
}))

import WorkoutDayEditor from './WorkoutDayEditor'
import type { WorkoutDay } from '../types'

const customDay: WorkoutDay = {
  id: 'custom-1',
  name: 'Apartment Push',
  slug: 'apartment-push',
  color: '#2563EB',
  subtitle: null,
  sort_order: 10,
  is_custom: true,
}

const seedDay: WorkoutDay = {
  ...customDay,
  id: 'seed-1',
  name: 'Push',
  slug: 'push',
  is_custom: false,
}

describe('WorkoutDayEditor', () => {
  it('shows delete for custom templates only', () => {
    const customHtml = renderToStaticMarkup(
      <WorkoutDayEditor
        workoutDay={customDay}
        dayExercises={[]}
        exercises={[]}
        muscleGroups={[]}
        onClose={() => undefined}
        onUpdated={async () => undefined}
      />,
    )
    expect(customHtml).toContain('Delete template')

    const seedHtml = renderToStaticMarkup(
      <WorkoutDayEditor
        workoutDay={seedDay}
        dayExercises={[]}
        exercises={[]}
        muscleGroups={[]}
        onClose={() => undefined}
        onUpdated={async () => undefined}
      />,
    )
    expect(seedHtml).not.toContain('Delete template')
  })
})
