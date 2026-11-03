import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { DownloadIcon, FileTextIcon, ImageIcon, LoaderCircleIcon, PencilIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DateRangePicker, type DateRangeValue } from '@/components/ui/date-range-picker'
import { Pagination } from '@/components/ui/pagination'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  EMPTY_FILTERS,
  computeTotals,
  filterEntries,
  hasActiveFilters,
  sortEntries,
  type EntryFilters,
  type EntryLabels,
} from '@/domain/ledger'
import { LEDGER_PAGE_SIZES } from '@/domain/schemas'
import type { Entry, GlobalSettings, LedgerPageSize } from '@/domain/types'
import type { IsoDate } from '@/lib/dates'
import { cn, pluralize } from '@/lib/utils'
import type { ExportFormat } from './export/exportLedger'

const EXPORTS: { format: ExportFormat; label: string; icon: typeof FileTextIcon }[] = [
  { format: 'pdf', label: 'PDF document', icon: FileTextIcon },
  { format: 'jpg', label: 'JPG image', icon: ImageIcon },
]
// Below xl: Date | Note | Amount (signed) | Edit. From xl: Date | Note | Method | Cash out | Cash in | Balance | Edit.
// Phones fold the date under the note.
const GRID =
  'grid grid-cols-[minmax(0,1fr)_auto_32px] items-center gap-x-3 px-4 sm:grid-cols-[92px_minmax(0,1fr)_104px_36px] sm:px-[22px] xl:grid-cols-[112px_minmax(180px,2fr)_120px_100px_100px_110px_44px]'
const NOT_PHONE = 'hidden sm:block'
const WIDE = 'hidden xl:block'
const NARROW = 'xl:hidden'

interface Props {
  partyName: string
  entries: Entry[]
  balances: Map<string, number>
  settings: GlobalSettings
  /** Saves date order and page size to the global settings. */
  onSettingsChange: (patch: Partial<GlobalSettings>) => void
  labels: EntryLabels
  today: IsoDate
  loading: boolean
  selectedId: string | null
  onEdit: (entry: Entry) => void
  fmt: {
    money: (n: number) => string
    date: (iso: string | null | undefined) => string
    caption: (balance: number) => string
  }
}

export function LedgerCard({
  partyName,
  entries,
  balances,
  settings,
  onSettingsChange,
  labels,
  today,
  loading,
  selectedId,
  onEdit,
  fmt,
}: Props) {
  const [filters, setFilters] = useState<EntryFilters>(EMPTY_FILTERS)
  const [range, setRange] = useState<DateRangeValue>({ from: '', to: '', preset: null })
  const [page, setPage] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState<ExportFormat | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const sortDir = settings.ledgerSortDir
  const pageSize = settings.ledgerPageSize

  const update = (patch: Partial<EntryFilters>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setPage(0)
  }

  const methods = useMemo(() => {
    const set = new Set(settings.paymentMethods)
    entries.forEach((e) => e.method && set.add(e.method))
    return [...set]
  }, [entries, settings.paymentMethods])

  const filtered = useMemo(() => filterEntries(entries, filters), [entries, filters])
  const sorted = useMemo(() => sortEntries(filtered, sortDir), [filtered, sortDir])
  const filteredTotals = useMemo(() => computeTotals(filtered), [filtered])
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const rows = sorted.slice(current * pageSize, current * pageSize + pageSize)
  const active = hasActiveFilters(filters)

  function goToPage(next: number) {
    setPage(next)
    // Paging from the footer of a long page: bring the first row back into view.
    const section = sectionRef.current
    if (section && section.getBoundingClientRect().top < 0) section.scrollIntoView({ block: 'start' })
  }

  async function runExport(format: ExportFormat) {
    setExporting(format)
    try {
      const { exportLedger } = await import('./export/exportLedger')
      await exportLedger({ partyName, entries: sorted, balances, labels, filters, generatedOn: today, fmt }, format)
      setExportOpen(false)
    } catch (err) {
      toast.error(err instanceof Error && err.name === 'ExportError' ? err.message : 'Could not create the export. Try again.')
    } finally {
      setExporting(null)
    }
  }

  const sortButton = (
    <button
      type="button"
      onClick={() => {
        onSettingsChange({ ledgerSortDir: sortDir === 'desc' ? 'asc' : 'desc' })
        setPage(0)
      }}
      className="eyebrow min-h-8 text-foreground outline-none focus-visible:underline"
      title={sortDir === 'desc' ? 'Newest first. Click for oldest first.' : 'Oldest first. Click for newest first.'}
    >
      Date {sortDir === 'desc' ? '↓' : '↑'}
    </button>
  )

  const clear = () => {
    setFilters(EMPTY_FILTERS)
    setRange({ from: '', to: '', preset: null })
    setPage(0)
  }

  return (
    <section
      ref={sectionRef}
      aria-labelledby="entries-heading"
      className="scroll-mt-4 rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(14,23,38,0.04)]"
    >
      <h2 id="entries-heading" className="sr-only">
        Entries
      </h2>
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3">
        <Segmented
          aria-label="Filter by type"
          value={filters.type}
          onValueChange={(type) => update({ type })}
          options={[
            { value: 'all', label: 'All' },
            { value: 'IN', label: labels.in },
            { value: 'OUT', label: labels.out },
          ]}
        />
        <Select
          size="sm"
          aria-label="Payment method"
          className="w-auto min-w-[136px]"
          value={filters.method}
          onValueChange={(method) => update({ method })}
          options={[{ value: 'all', label: 'All methods' }, ...methods.map((m) => ({ value: m, label: m }))]}
        />
        <DateRangePicker
          value={range}
          today={today}
          dateFormat={settings.dateFormat}
          onChange={(next) => {
            setRange(next)
            update({ from: next.from, to: next.to })
          }}
        />
        <div className="relative flex min-w-[140px] flex-1 items-center">
          <SearchIcon className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground" aria-hidden="true" />
          <label htmlFor="entry-search" className="sr-only">
            Search notes
          </label>
          <input
            id="entry-search"
            type="search"
            value={filters.query}
            onChange={(e) => update({ query: e.target.value })}
            placeholder="Search notes"
            className="h-[34px] w-full rounded-lg border border-input bg-background pl-[30px] pr-2.5 text-[13px] outline-none focus-visible:border-brand-border focus-visible:ring-[3px] focus-visible:ring-brand-soft"
          />
        </div>
        {active && (
          <button
            type="button"
            onClick={clear}
            className="h-[34px] rounded-lg px-2 text-[13px] font-semibold text-brand-strong outline-none hover:bg-brand-soft focus-visible:ring-[3px] focus-visible:ring-ring"
          >
            Clear
          </button>
        )}
        <Popover open={exportOpen} onOpenChange={(open) => !exporting && setExportOpen(open)}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-[34px] rounded-lg" disabled={loading || sorted.length === 0}>
              <DownloadIcon className="size-[15px]" aria-hidden="true" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[264px] p-1.5">
            <p className="px-2.5 pb-2 pt-1.5 text-[12.5px] text-muted-foreground">
              {active
                ? `Exports the ${pluralize(sorted.length, 'entry', 'entries')} that match your filters`
                : `Exports all ${pluralize(sorted.length, 'entry', 'entries')}`}
              , {sortDir === 'desc' ? 'newest' : 'oldest'} first.
            </p>
            {EXPORTS.map(({ format, label, icon: Icon }) => (
              <button
                key={format}
                type="button"
                disabled={!!exporting}
                onClick={() => void runExport(format)}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-medium outline-none hover:bg-brand-soft hover:text-brand-strong focus-visible:bg-brand-soft focus-visible:text-brand-strong disabled:opacity-60"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
                {exporting === format && (
                  <LoaderCircleIcon className="ml-auto size-4 animate-spin" aria-label="Preparing" />
                )}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>

      <div className="overflow-x-auto">
        <div role="table" aria-labelledby="entries-heading" aria-rowcount={sorted.length + 1} className="sm:min-w-[440px] xl:min-w-[800px]">
          <div role="row" className={cn(GRID, 'eyebrow min-h-[42px] border-b border-hairline text-muted-foreground')}>
            <div role="columnheader" aria-sort={sortDir === 'desc' ? 'descending' : 'ascending'} className={NOT_PHONE}>
              {sortButton}
            </div>
            <div role="columnheader">
              <span className="sm:hidden">{sortButton}</span>
              <span className="hidden sm:inline">Note</span>
            </div>
            <div role="columnheader" className={WIDE}>Method</div>
            <div role="columnheader" className={cn(WIDE, 'text-right')}>{labels.out}</div>
            <div role="columnheader" className={cn(WIDE, 'text-right')}>{labels.in}</div>
            <div role="columnheader" className={cn(NARROW, 'text-right')}>Amount</div>
            <div role="columnheader" className={cn(WIDE, 'text-right')}>Balance</div>
            <div role="columnheader">
              <span className="sr-only">Edit</span>
            </div>
          </div>

          {loading &&
            Array.from({ length: 6 }, (_, i) => (
              <div key={i} role="row" className={cn(GRID, 'min-h-[52px] border-b border-hairline')}>
                <Skeleton className={cn(NOT_PHONE, 'h-4 w-20')} />
                <Skeleton className="h-4 w-40" />
                <Skeleton className={cn(WIDE, 'h-4 w-16')} />
                <Skeleton className={cn(WIDE, 'ml-auto h-4 w-14')} />
                <Skeleton className={cn(WIDE, 'ml-auto h-4 w-14')} />
                <Skeleton className={cn(NARROW, 'ml-auto h-4 w-16')} />
                <Skeleton className={cn(WIDE, 'ml-auto h-4 w-16')} />
                <span />
              </div>
            ))}

          {!loading &&
            rows.map((e) => {
              const selected = e.id === selectedId
              return (
                <div
                  key={e.id}
                  role="row"
                  onClick={() => onEdit(e)}
                  className={cn(
                    GRID,
                    'min-h-[52px] cursor-pointer border-b border-hairline hover:bg-background',
                    selected && 'bg-brand-soft hover:bg-brand-soft',
                  )}
                >
                  <div role="cell" className={cn(NOT_PHONE, 'tabular text-subtle-foreground')}>
                    {fmt.date(e.date)}
                  </div>
                  <div role="cell" className="min-w-0" title={e.notes}>
                    <span className="block truncate font-medium">
                      {e.notes || <span className="text-muted-foreground">—</span>}
                    </span>
                    <span className="tabular block text-xs text-muted-foreground sm:hidden">{fmt.date(e.date)}</span>
                  </div>
                  <div role="cell" className={cn(WIDE, 'truncate text-subtle-foreground')}>
                    {e.method || '—'}
                  </div>
                  <div role="cell" className={cn(WIDE, 'tabular text-right font-medium opacity-80', e.type === 'OUT' ? 'text-expense' : 'text-input-strong')}>
                    {e.type === 'OUT' ? fmt.money(e.amount) : '–'}
                  </div>
                  <div role="cell" className={cn(WIDE, 'tabular text-right font-medium opacity-80', e.type === 'IN' ? 'text-income' : 'text-input-strong')}>
                    {e.type === 'IN' ? fmt.money(e.amount) : '–'}
                  </div>
                  <div role="cell" className={cn(NARROW, 'tabular text-right font-semibold', e.type === 'IN' ? 'text-income' : 'text-expense')}>
                    <span className="sr-only">{`${e.type === 'IN' ? labels.in : labels.out} `}</span>
                    {e.type === 'IN' ? '+' : '−'}
                    {fmt.money(e.amount)}
                  </div>
                  <div role="cell" className={cn(WIDE, 'tabular text-right text-label opacity-80 font-medium')}>
                    {fmt.money(balances.get(e.id) ?? 0)}
                  </div>
                  <div role="cell" className="flex justify-end">
                    <button
                      type="button"
                      aria-label={`Edit entry from ${fmt.date(e.date)}, ${fmt.money(e.amount)}`}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        onEdit(e)
                      }}
                      className="flex size-8 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring"
                    >
                      <PencilIcon className="size-[15px]" />
                    </button>
                  </div>
                </div>
              )
            })}

          {!loading && rows.length === 0 && (
            <div className="px-6 py-10 text-center text-muted-foreground">
              {entries.length === 0 ? (
                `No entries yet. Use ${labels.outAction} or ${labels.inAction} below to record the first one.`
              ) : (
                <>
                  No entries match these filters.{' '}
                  <button type="button" onClick={clear} className="font-semibold text-brand-strong hover:underline">
                    Clear filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 pl-[22px] pr-4 text-[12.5px] text-subtle-foreground">
        <span aria-live="polite">
          {sorted.length
            ? `${current * pageSize + 1}–${current * pageSize + rows.length} of ${sorted.length} ${active ? 'matching entries' : 'entries'}`
            : '0 entries'}
          {active && sorted.length > 0 && (
            <>
              {' · got '}
              <span className="font-semibold text-income">{fmt.money(filteredTotals.totalIn)}</span>
              {' · gave '}
              <span className="font-semibold text-expense">{fmt.money(filteredTotals.totalOut)}</span>
            </>
          )}
        </span>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {entries.length > LEDGER_PAGE_SIZES[0] && (
            <div className="flex items-center gap-2">
              <span aria-hidden="true">Rows per page</span>
              <Select
                size="sm"
                aria-label="Rows per page"
                className="w-[72px]"
                value={String(pageSize)}
                onValueChange={(v) => {
                  onSettingsChange({ ledgerPageSize: Number(v) as LedgerPageSize })
                  setPage(0)
                }}
                options={LEDGER_PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
              />
            </div>
          )}
          {pageCount > 1 && <Pagination page={current} pageCount={pageCount} onPageChange={goToPage} />}
        </div>
      </div>
    </section>
  )
}
