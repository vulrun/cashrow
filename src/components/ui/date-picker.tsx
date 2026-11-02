import * as React from 'react'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { addDays, formatDate, monthOf, type DateFormat, type IsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Calendar } from './calendar'
import { fieldClass } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  id?: string
  value: IsoDate
  onChange: (iso: IsoDate) => void
  today: IsoDate
  max?: IsoDate
  dateFormat?: DateFormat
  className?: string
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  /** Open on mount (used by the demo screenshots and tests). */
  defaultOpen?: boolean
}

export function DatePicker({
  id,
  value,
  onChange,
  today,
  max,
  dateFormat = 'text',
  className,
  defaultOpen,
  ...aria
}: DatePickerProps) {
  const [open, setOpen] = React.useState(!!defaultOpen)
  const [view, setView] = React.useState(monthOf(value || today))
  const yesterday = addDays(today, -1)

  const full = formatDate(value, dateFormat)
  const label = value === today ? 'Today' : value === yesterday ? 'Yesterday' : full

  function choose(iso: IsoDate) {
    onChange(iso)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setView(monthOf(value || today))
      }}
    >
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          {...aria}
          className={cn(fieldClass, 'flex h-10 items-center gap-2 pl-3 pr-2.5 text-left', className)}
        >
          <CalendarIcon className="size-4 shrink-0 text-brand-strong" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate" title={full}>
            {label}
            {label !== full && <span className="sr-only">, {full}</span>}
          </span>
          <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Choose a date"
        className="w-[336px] max-w-[calc(100vw-24px)] p-3.5"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          view={view}
          onViewChange={setView}
          today={today}
          max={max}
          selected={value}
          onSelect={choose}
          autoFocus
        />
        <div className="mt-2.5 flex gap-2 border-t border-hairline pt-2.5">
          <button
            type="button"
            onClick={() => choose(today)}
            className="h-9 rounded-full border border-brand-border bg-brand-soft px-3.5 text-[13px] font-semibold text-brand-strong outline-none hover:bg-brand-softer focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => choose(yesterday)}
            className="h-9 rounded-full border border-border bg-card px-3.5 text-[13px] font-semibold text-label outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Yesterday
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
