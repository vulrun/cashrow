import { balanceDirection, computeTotals, type BalanceDirection, type EntryFilters, type EntryLabels } from '@/domain/ledger'
import type { Entry, EntryType } from '@/domain/types'
import type { IsoDate } from '@/lib/dates'
import { pluralize } from '@/lib/utils'

export interface LedgerReportInput {
  partyName: string
  /** Already filtered and in display order. */
  entries: Entry[]
  /** Running balance per entry id, over the whole ledger (as on screen). */
  balances: Map<string, number>
  labels: EntryLabels
  filters: EntryFilters
  generatedOn: IsoDate
  fmt: {
    money: (n: number) => string
    date: (iso: string | null | undefined) => string
    caption: (balance: number) => string
  }
}

export interface ReportRow {
  type: EntryType
  date: string
  notes: string
  method: string
  out: string
  in: string
  balance: string
}

export interface ReportTotal {
  label: string
  value: string
  tone: 'income' | 'expense' | BalanceDirection
}

/** Everything an export draws, already formatted. */
export interface LedgerReport {
  title: string
  filterSummary: string
  count: string
  totals: ReportTotal[]
  columns: { out: string; in: string }
  rows: ReportRow[]
  generated: string
  /** File name without extension. */
  fileName: string
}

export function buildLedgerReport({ partyName, entries, balances, labels, filters, generatedOn, fmt }: LedgerReportInput): LedgerReport {
  const totals = computeTotals(entries)
  return {
    title: partyName,
    filterSummary: filterSummary(filters, labels, fmt.date),
    count: pluralize(entries.length, 'entry', 'entries'),
    totals: [
      { label: labels.in, value: fmt.money(totals.totalIn), tone: 'income' },
      { label: labels.out, value: fmt.money(totals.totalOut), tone: 'expense' },
      {
        label: `Balance · ${fmt.caption(totals.balance)}`,
        value: fmt.money(Math.abs(totals.balance)),
        tone: balanceDirection(totals.balance),
      },
    ],
    columns: { out: labels.out, in: labels.in },
    rows: entries.map((e) => ({
      type: e.type,
      date: fmt.date(e.date),
      notes: e.notes,
      method: e.method,
      out: e.type === 'OUT' ? fmt.money(e.amount) : '–',
      in: e.type === 'IN' ? fmt.money(e.amount) : '–',
      balance: fmt.money(balances.get(e.id) ?? 0),
    })),
    generated: `Generated ${fmt.date(generatedOn)}`,
    fileName: fileName(partyName, filters, generatedOn),
  }
}

export function filterSummary(f: EntryFilters, labels: EntryLabels, date: (iso: string) => string): string {
  const parts: string[] = []
  if (f.type !== 'all') parts.push(`${f.type === 'IN' ? labels.in : labels.out} only`)
  if (f.method !== 'all') parts.push(f.method)
  if (f.from && f.to) parts.push(`${date(f.from)} – ${date(f.to)}`)
  else if (f.from) parts.push(`From ${date(f.from)}`)
  else if (f.to) parts.push(`Until ${date(f.to)}`)
  const q = f.query.trim()
  if (q) parts.push(`Matching “${q}”`)
  return parts.length ? parts.join(' · ') : 'All entries'
}

/** "Cashrow - Sharma Traders - 2026-10-01 to 2026-10-31", without characters file systems reject. */
export function fileName(partyName: string, f: EntryFilters, today: IsoDate): string {
  const range = f.from || f.to ? `${f.from || 'start'} to ${f.to || today}` : today
  return `Cashrow - ${partyName} - ${range}`
    .replace(/[\\/:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}
