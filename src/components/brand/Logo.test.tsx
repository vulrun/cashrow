import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo, Wordmark } from './Logo'

describe('Wordmark', () => {
  it('sets the default name as the two-tone wordmark', () => {
    const { container } = render(<Wordmark name="Cashrow" />)
    expect(container.textContent).toBe('cashrow')
    expect(screen.getByText('row')).toHaveClass('text-brand')
  })

  it('shows a custom APP_NAME as plain text', () => {
    const { container } = render(<Wordmark name="Acme Cash" />)
    expect(container.textContent).toBe('Acme Cash')
    expect(container.querySelector('.text-brand')).toBeNull()
  })
})

describe('Logo', () => {
  it('draws the mark as decorative SVG next to the name', () => {
    const { container } = render(<Logo name="Cashrow" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(svg?.querySelectorAll('path')).toHaveLength(2)
  })
})
