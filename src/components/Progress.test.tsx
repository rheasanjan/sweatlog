import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({
  fetchStrengthHistory: vi.fn(),
  logBodyCheckin: vi.fn(),
}))

import Progress from './Progress'

describe('Progress', () => {
  it('uses the prototype header and bordered metric cards', () => {
    const html = renderToStaticMarkup(
      <Progress
        sessions={[]}
        bodyLog={[]}
        exercises={[]}
        onBack={() => undefined}
        onCheckinSaved={async () => undefined}
      />,
    )

    expect(html).toContain('Your trends and training progress')
    expect(html).toContain('linear-gradient')
    expect(html).toContain('border:1px solid #E7EAF0')
    expect(html).toContain('Body weight')
  })
})
