import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import LogActivityPicker from './LogActivityPicker'
import type { Activity } from '../types'

const run: Activity = {
  id: 'run-1',
  category: 'cardio',
  name: 'Run',
  color: '#00A9A0',
  workout_day_id: null,
  status: 'completed',
  started_at: '2026-08-19T12:00:00.000Z',
  finished_at: '2026-08-19T12:20:00.000Z',
  duration_mins: 20,
  note: null,
  details: { distance_km: 2.1 },
}

describe('LogActivityPicker', () => {
  it('renders quick log and the existing activity catalog in one screen', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-20T12:00:00.000Z'))

    const html = renderToStaticMarkup(
      <LogActivityPicker
        activities={[run]}
        onBack={() => undefined}
        onSelectStrength={() => undefined}
        onSelectType={() => undefined}
      />,
    )

    expect(html).toContain('Log Activity')
    expect(html).toContain('Thu, 20 Aug')
    expect(html).toContain('Search activities')
    expect(html).toContain('Quick log')
    expect(html).toContain('Strength')
    expect(html).toContain('Run')
    expect(html).toContain('Last: Yesterday')
    expect(html).toContain('Cardio')
    expect(html).toContain('Incline Walk')
    expect(html).toContain('Pickleball')
    expect(html).toContain('Yoga')
    expect(html).not.toContain('Football')

    vi.useRealTimers()
  })
})
