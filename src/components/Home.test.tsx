import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import Home from './Home'
import type { Activity, WorkoutTemplate } from '../types'

const template: WorkoutTemplate = {
  id: 'template-1',
  name: 'Push Day',
  slug: 'push-day',
  color: '#DC2626',
  subtitle: null,
  sort_order: 0,
  is_custom: false,
}

const activity: Activity = {
  id: 'activity-1',
  category: 'strength',
  name: 'Upper Body',
  color: '#7C3AED',
  workout_day_id: template.id,
  status: 'completed',
  started_at: '2026-08-17T08:00:00.000Z',
  finished_at: '2026-08-17T09:00:00.000Z',
  duration_mins: 60,
  note: null,
  workout_days: template,
  session_sets: [],
}

describe('Home', () => {
  it('renders activity stats, template shortcuts, and activity snapshots', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-17T12:00:00.000Z'))

    const html = renderToStaticMarkup(
      <Home
        templates={[template]}
        activities={[activity]}
        bodyLog={[]}
        onStart={() => undefined}
        onStartTemplate={() => undefined}
        onEditSession={() => undefined}
      />,
    )

    expect(html).toContain('1 sessions')
    expect(html).toContain('Templates')
    expect(html).toContain('Recent Activity')
    expect(html).toContain('Upper Body')
    expect(html).toContain('border-left:3px solid #7C3AED')
    expect(html).not.toContain('Streak')
    expect(html).not.toContain('This Week</div><div')

    vi.useRealTimers()
  })
})
