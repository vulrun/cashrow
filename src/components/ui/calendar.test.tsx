import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { MonthView } from '@/lib/dates'
import { Calendar } from './calendar'

function Harness(props: { onSelect: (iso: string) => void; max?: string }) {
  const [view, setView] = useState<MonthView>({ year: 2026, month: 9 })
  return (
    <Calendar
      view={view}
      onViewChange={setView}
      today="2026-10-20"
      max={props.max}
      selected="2026-10-18"
      onSelect={props.onSelect}
      autoFocus
    />
  )
}

describe('Calendar', () => {
  it('focuses the selected day and moves with the keyboard', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} />)
    expect(screen.getByRole('button', { name: '18 October 2026' })).toHaveFocus()
    expect(screen.getByRole('button', { name: '18 October 2026' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '20 October 2026, today' })).toHaveAttribute('aria-current', 'date')

    await userEvent.keyboard('{ArrowRight}{ArrowDown}{Enter}')
    expect(onSelect).toHaveBeenCalledWith('2026-10-26')
  })

  it('pages to the next month from the keyboard', async () => {
    render(<Harness onSelect={() => {}} />)
    await userEvent.keyboard('{PageDown}')
    expect(screen.getByText('November 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '18 November 2026' })).toHaveFocus()
  })

  it('does not select days after max', async () => {
    const onSelect = vi.fn()
    render(<Harness onSelect={onSelect} max="2026-10-20" />)
    const late = screen.getByRole('button', { name: '25 October 2026' })
    expect(late).toHaveAttribute('aria-disabled', 'true')
    await userEvent.click(late)
    expect(onSelect).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })
})
