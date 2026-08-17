import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Picker, { resolveTemplateSelection } from './Picker'
import type { Activity, WorkoutTemplate } from '../types'

vi.mock('../lib/supabase', () => ({
  createWorkoutDay: vi.fn(),
  fetchWorkoutDayExercises: vi.fn(),
  fetchInProgressSession: vi.fn(),
}))

const template: WorkoutTemplate = {
  id: 'template-1',
  name: 'Push Day',
  slug: 'push-day',
  color: '#DC2626',
  subtitle: null,
  sort_order: 0,
  is_custom: false,
}

const inProgress: Activity = {
  id: 'activity-1',
  category: 'strength',
  name: 'Push Day',
  color: template.color,
  workout_day_id: template.id,
  status: 'in_progress',
  started_at: '2026-08-17T08:00:00.000Z',
  finished_at: null,
  duration_mins: null,
  note: null,
  workout_days: template,
  session_sets: [],
}

describe('Picker', () => {
  it('starts a new activity even when the template was completed this week', () => {
    const completed = { ...inProgress, id: 'completed-1', status: 'completed', finished_at: '2026-08-17T09:00:00.000Z' }
    const html = renderToStaticMarkup(
      <Picker
        workoutDays={[template]}
        sessions={[completed]}
        exercises={[]}
        muscleGroups={[]}
        onBack={() => undefined}
        onSelect={() => undefined}
        onResume={() => undefined}
        onDaysChanged={async () => undefined}
      />,
    )

    expect(html).toContain('Last done: Today')
    expect(html).not.toContain('DONE THIS WEEK')
    expect(html).not.toContain('Tap to edit')
    expect(html).not.toContain('SKIPPED')
    expect(html).not.toContain('Not doing this workout this week')
  })

  it('resumes an in-progress activity instead of starting a new one', async () => {
    const onSelect = vi.fn()
    const onResume = vi.fn()

    await resolveTemplateSelection(
      template,
      new Date('2026-08-17T12:00:00.000Z'),
      onSelect,
      onResume,
      async () => inProgress,
    )

    expect(onResume).toHaveBeenCalledWith(inProgress)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('starts a new activity when no in-progress activity exists', async () => {
    const logDate = new Date('2026-08-17T12:00:00.000Z')
    const onSelect = vi.fn()
    const onResume = vi.fn()

    await resolveTemplateSelection(template, logDate, onSelect, onResume, async () => null)

    expect(onSelect).toHaveBeenCalledWith(template, logDate)
    expect(onResume).not.toHaveBeenCalled()
  })
})
