import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import History from './History'
import type { Activity } from '../types'

const activities: Activity[] = [
  {
    id: 'activity-older',
    category: 'strength',
    name: 'Push',
    color: '#DC2626',
    workout_day_id: 'template-push',
    status: 'completed',
    started_at: '2026-08-17T08:00:00.000Z',
    finished_at: '2026-08-17T09:00:00.000Z',
    duration_mins: 60,
    note: null,
    workout_days: {
      id: 'template-push',
      name: 'Old Template Name',
      slug: 'push',
      color: '#2563EB',
      subtitle: null,
    },
    session_sets: [],
  },
  {
    id: 'activity-newer',
    category: 'strength',
    name: 'Push',
    color: '#7C3AED',
    workout_day_id: 'template-push',
    status: 'completed',
    started_at: '2026-08-19T08:00:00.000Z',
    finished_at: '2026-08-19T08:45:00.000Z',
    duration_mins: 45,
    note: null,
    workout_days: {
      id: 'template-push',
      name: 'Old Template Name',
      slug: 'push',
      color: '#2563EB',
      subtitle: null,
    },
    session_sets: [],
  },
]

describe('History', () => {
  it('renders each finished activity once in reverse chronological order using activity snapshots', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))

    const html = renderToStaticMarkup(
      <History
        activities={activities}
        onBack={() => undefined}
        onEditSession={() => undefined}
      />,
    )

    expect(html).toContain('>History<')
    expect(html.match(/>Push</g)).toHaveLength(2)
    expect(html).not.toContain('Old Template Name')
    expect(html).not.toContain('Not logged')
    expect(html).not.toContain('Week overview')
    expect(html.indexOf('45 min')).toBeLessThan(html.indexOf('60 min'))
    expect(html).toContain('background:#F1EEFF')
    expect(html).toContain('aria-label="Edit Push"')
    expect(html).not.toContain('border-left')
    expect(html).not.toContain('No sessions this week')

    vi.useRealTimers()
  })
})
