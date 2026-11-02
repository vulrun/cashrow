import * as React from 'react'
import { CalendarIcon, ChevronDownIcon } from 'lucide-react'
import { datePresets, type DatePresetKey } from '@/domain/ledger'
import { formatDate, formatRange, monthOf, type DateFormat, type IsoDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export interface DateRangeValue {
  from: IsoDate | ''
  to: IsoDate | ''
  /** Set when the range came from a preset, so the button can show its name. */
  preset?: DatePresetKey | null
}

interface DateRangePickerProps {
  value: DateRangeValue
  onChange: (value: DateRangeValue) => void
  today: IsoDate
  dateFormat?: DateFormat
  className?: string
}

export function DateRangePicker({ value, onChange, today, dateFormat = 'text', className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [view, setView] = React.useState(monthOf(value.to || value.from || today))
  const [picking, setPicking] = React.useState<'start' | 'end'>('start')
  const presets = datePresets(today)
  const active = !!(value.from || value.to)
  const activePreset = value.preset ? presets.find((p) => p.key === value.preset) : null

  const label = activePreset
    ? activePreset.label
    : value.from && value.to
      ? formatRange(value.from, value.to, dateFormat)
      : value.from
        ? `From ${formatDate(value.from, dateFormat)}`
        : 'Any date'

  function pickDay(iso: IsoDate) {
    if (picking === 'start' || !value.from) {
      onChange({ from: iso, to: '', preset: null })
      setPicking('end')
      return
    }
    const [from, to] = iso < value.from ? [iso, value.from] : [value.from, iso]
    onChange({ from, to, preset: null })
    setPicking('start')
    setOpen(false)
  }

  function choose(next: DateRangeValue) {
    onChange(next)
    setPicking('start')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setPicking('start')
          setView(monthOf(value.to || value.from || today))
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Date range: ${label}`}
          className={cn(
            'flex h-[34px] items-center gap-2 whitespace-nowrap rounded-lg border px-2.5 text-[13px] font-medium outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
            active
              ? 'border-brand-border bg-brand-soft text-brand-strong'
              : 'border-input bg-background text-foreground hover:bg-muted',
            className,
          )}
        >
          <CalendarIcon className="size-[15px]" aria-hidden="true" />
          <span>{label}</span>
          <ChevronDownIcon className="size-3.5" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Filter by date"
        className="flex max-w-[calc(100vw-24px)] flex-wrap overflow-hidden p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div
          role="group"
          aria-label="Quick ranges"
          className="flex min-w-[150px] flex-col gap-0.5 border-hairline p-3 sm:border-r"
        >
          <PresetButton pressed={!active} onClick={() => choose({ from: '', to: '', preset: null })}>
            All dates
          </PresetButton>
          {presets.map((p) => (
            <PresetButton
              key={p.key}
              pressed={value.preset === p.key}
              onClick={() => choose({ from: p.from, to: p.to, preset: p.key })}
            >
              {p.label}
            </PresetButton>
          ))}
        </div>
        <div className="w-[336px] max-w-full p-3.5">
          <Calendar
            view={view}
            onViewChange={setView}
            today={today}
            max={today}
            range={{ from: value.from, to: value.to }}
            onSelect={pickDay}
            autoFocus
          />
          <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-hairline pt-2.5">
            <span className="text-[12.5px] text-subtle-foreground" aria-live="polite">
              {picking === 'end' ? 'Now pick the end date' : 'Pick a start date'}
            </span>
            <button
              type="button"
              onClick={() => choose({ from: '', to: '', preset: null })}
              className="h-8 rounded-lg px-2.5 text-[13px] font-semibold text-brand-strong outline-none hover:bg-brand-soft focus-visible:ring-[3px] focus-visible:ring-ring"
            >
              Clear
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PresetButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        'h-9 rounded-lg px-3 text-left text-[13px] font-semibold outline-none focus-visible:ring-[3px] focus-visible:ring-ring',
        pressed ? 'bg-brand-soft text-brand-strong' : 'text-label hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
