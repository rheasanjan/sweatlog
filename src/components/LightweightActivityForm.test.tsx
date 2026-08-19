import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  createLightweightActivity: vi.fn(),
  updateLightweightActivity: vi.fn(),
}))

import LightweightActivityForm from './LightweightActivityForm'

describe('LightweightActivityForm', () => {
  it('shows Duration (min) and no timer/stopwatch UI', () => {
    const html = renderToStaticMarkup(
      <LightweightActivityForm
        category="cardio"
        activityType={{ id: 'run', label: 'Run', color: '#0891B2' }}
        onBack={() => undefined}
        onSaved={() => undefined}
      />,
    )

    expect(html).toContain('Duration (min)')
    expect(html).toContain('Save activity')
    expect(html.toLowerCase()).not.toContain('timer')
    expect(html.toLowerCase()).not.toContain('stopwatch')
    expect(html).toContain('disabled=""')
  })
})
