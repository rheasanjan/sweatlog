import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import ActivityCategoryPicker from './ActivityCategoryPicker'
import ActivityTypePicker from './ActivityTypePicker'

describe('ActivityCategoryPicker', () => {
  it('shows What did you do? and all four categories', () => {
    const html = renderToStaticMarkup(
      <ActivityCategoryPicker onBack={() => undefined} onSelectCategory={() => undefined} />,
    )
    expect(html).toContain('What did you do?')
    expect(html).toContain('Strength')
    expect(html).toContain('Cardio')
    expect(html).toContain('Sport')
    expect(html).toContain('Mobility')
  })
})

describe('ActivityTypePicker', () => {
  it('lists cardio types including Run', () => {
    const html = renderToStaticMarkup(
      <ActivityTypePicker
        category="cardio"
        onBack={() => undefined}
        onSelectType={() => undefined}
      />,
    )
    expect(html).toContain('Cardio')
    expect(html).toContain('Run')
    expect(html).toContain('Incline Walk')
  })
})
