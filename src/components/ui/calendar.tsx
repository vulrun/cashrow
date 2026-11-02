import * as React from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import {
  WEEKDAYS,
  addDays,
  compareMonth,
  formatLongDate,
  monthGrid,
  monthOf,
  monthTitle,
  shiftMonth,
  type IsoDate,
  type MonthView,
} from '@/lib/dates'
import { cn } from '@/lib/utils'

export interface CalendarProps {
  view: MonthView
  onViewChange: (view: MonthView) => void
  today: IsoDate
  /** Days after this are disabled (e.g. no future-dated entries). */
  max?: IsoDate
  /** Single-date mode. */
  selected?: IsoDate | null
  /** Range mode. */
  range?: { from: IsoDate | ''; to: IsoDate | '' }
  onSelect: (iso: IsoDate) => void
  /** Focus the selected (or today's) day when mounted. */
  autoFocus?: boolean
  className?: string
}

/**
 * Month calendar with full keyboard support:
 * arrows move by day/week, PageUp/PageDown by month, Home/End to week edges,
 * Enter/Space selects.
 */
export function Calendar({
  view,
  onViewChange,
  today,
  max,
  selected,
  range,
  onSelect,
  autoFocus,
  className,
}: CalendarProps) {
  const gridRef = React.useRef<HTMLDivElement>(null)
  const initialFocus = selected || range?.to || range?.from || today
  const [focused, setFocused] = React.useState<IsoDate>(initialFocus)
  // Set when the next render should move DOM focus to the tabbable day.
  const pendingFocus = React.useRef(!!autoFocus)

  // Keep the roving focus inside the visible month.
  const cells = monthGrid(view)
  const inView = cells.includes(focused)
  const tabbable = inView ? focused : (cells.find((c) => c && c === today) ?? cells.find(Boolean)!)

  React.useEffect(() => {
    if (!pendingFocus.current) return
    pendingFocus.current = false
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-iso="${tabbable}"]`)?.focus()
  })

  const isDisabled = (iso: IsoDate) => !!max && iso > max
  const nextDisabled = !!max && compareMonth(view, monthOf(max)) >= 0

  function moveFocus(next: IsoDate) {
    if (max && next > max) return
    setFocused(next)
    if (compareMonth(monthOf(next), view) !== 0) onViewChange(monthOf(next))
    pendingFocus.current = true
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const day = new Date(`${tabbable}T00:00:00Z`).getUTCDay()
    const moves: Record<string, () => IsoDate> = {
      ArrowLeft: () => addDays(tabbable, -1),
      ArrowRight: () => addDays(tabbable, 1),
      ArrowUp: () => addDays(tabbable, -7),
      ArrowDown: () => addDays(tabbable, 7),
      Home: () => addDays(tabbable, -day),
      End: () => addDays(tabbable, 6 - day),
      PageUp: () => shiftDate(tabbable, -1),
      PageDown: () => shiftDate(tabbable, 1),
    }
    const move = moves[e.key]
    if (!move) return
    e.preventDefault()
    moveFocus(move())
  }

  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => onViewChange(shiftMonth(view, -1))}
          className="flex size-9 items-center justify-center rounded-[10px] bg-muted text-foreground outline-none hover:bg-border focus-visible:ring-[3px] focus-visible:ring-ring"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <span className="text-sm font-bold" aria-live="polite">
          {monthTitle(view)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={nextDisabled}
          onClick={() => onViewChange(shiftMonth(view, 1))}
          className="flex size-9 items-center justify-center rounded-[10px] bg-muted text-foreground outline-none hover:bg-border focus-visible:ring-[3px] focus-visible:ring-ring disabled:opacity-40"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
      <div
        ref={gridRef}
        role="group"
        aria-label={monthTitle(view)}
        onKeyDown={onKeyDown}
        className="grid grid-cols-7 gap-y-0.5"
      >
        {WEEKDAYS.map((w) => (
          <abbr
            key={w.short}
            title={w.long}
            className="flex h-7 items-center justify-center text-[11.5px] font-bold text-muted-foreground no-underline"
          >
            {w.short}
          </abbr>
        ))}
        {cells.map((iso, i) => {
          if (!iso) return <span key={`pad-${i}`} aria-hidden="true" className="h-10" />
          const disabled = isDisabled(iso)
          const isToday = iso === today
          const edge = range ? iso === range.from || iso === range.to : iso === selected
          const middle = !!range && !!range.from && !!range.to && iso > range.from && iso < range.to
          return (
            <button
              key={iso}
              type="button"
              data-iso={iso}
              tabIndex={iso === tabbable ? 0 : -1}
              aria-label={`${formatLongDate(iso)}${isToday ? ', today' : ''}`}
              aria-pressed={edge}
              aria-current={isToday ? 'date' : undefined}
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (disabled) return
                setFocused(iso)
                onSelect(iso)
              }}
              onFocus={() => setFocused(iso)}
              className={cn(
                'tabular h-10 text-[13.5px] font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
                edge
                  ? 'rounded-[10px] bg-brand-strong font-bold text-white'
                  : middle
                    ? 'rounded-none bg-brand-softer text-brand-strong'
                    : 'rounded-[10px] hover:bg-muted',
                isToday && !edge && 'font-bold shadow-[inset_0_0_0_1.5px_var(--brand-border)]',
                disabled && 'cursor-not-allowed text-input-strong hover:bg-transparent',
              )}
            >
              {Number(iso.slice(8, 10))}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Same day-of-month in another month, clamped to that month's length. */
function shiftDate(iso: IsoDate, months: number): IsoDate {
  const target = shiftMonth(monthOf(iso), months)
  const day = Number(iso.slice(8, 10))
  const last = new Date(Date.UTC(target.year, target.month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.year, target.month, Math.min(day, last))).toISOString().slice(0, 10)
}
