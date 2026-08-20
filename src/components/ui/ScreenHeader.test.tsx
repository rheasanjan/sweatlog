import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ScreenHeader from './ScreenHeader'

describe('ScreenHeader', () => {
  it('renders prototype header copy and an accessible back action', () => {
    const html = renderToStaticMarkup(
      <ScreenHeader
        title="History"
        subtitle="Your training timeline"
        onBack={() => undefined}
      />,
    )

    expect(html).toContain('History')
    expect(html).toContain('Your training timeline')
    expect(html).toContain('aria-label="Back"')
    expect(html).toContain('linear-gradient')
    expect(html).toContain('Manrope')
  })
})
