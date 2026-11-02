import { addDays, isoOf, monthOf, shiftMonth, type IsoDate } from '@/lib/dates'
import type { BalanceWording, Entry, EntryType, Party, PartyTotals } from './types'

export function computeTotals(entries: Entry[]): PartyTotals {
  let totalIn = 0
  let totalOut = 0
  let inCount = 0
  let outCount = 0
  let lastDate: IsoDate | null = null
  for (const e of entries) {
    if (e.type === 'IN') {
      totalIn += e.amount
      inCount++
    } else {
      totalOut += e.amount
      outCount++
    }
    if (!lastDate || e.date > lastDate) lastDate = e.date
  }
  totalIn = round2(totalIn)
  totalOut = round2(totalOut)
  return {
    totalIn,
    totalOut,
    balance: round2(totalIn - totalOut),
    count: entries.length,
    inCount,
    outCount,
    lastDate,
  }
}

export function sumTotals(list: PartyTotals[]): PartyTotals {
  return list.reduce<PartyTotals>(
    (acc, t) => ({
      totalIn: round2(acc.totalIn + t.totalIn),
      totalOut: round2(acc.totalOut + t.totalOut),
      balance: round2(acc.balance + t.balance),
      count: acc.count + t.count,
      inCount: acc.inCount + t.inCount,
      outCount: acc.outCount + t.outCount,
      lastDate: !acc.lastDate || (t.lastDate && t.lastDate > acc.lastDate) ? t.lastDate : acc.lastDate,
    }),
    { totalIn: 0, totalOut: 0, balance: 0, count: 0, inCount: 0, outCount: 0, lastDate: null },
  )
}

/** Oldest first; same-day entries keep their sheet order. */
export function chronological(a: Entry, b: Entry): number {
  return a.date === b.date ? a.row - b.row : a.date < b.date ? -1 : 1
}

/** Balance after each entry (cash in minus cash out, accumulated oldest first). */
export function runningBalances(entries: Entry[]): Map<string, number> {
  const map = new Map<string, number>()
  let balance = 0
  for (const e of [...entries].sort(chronological)) {
    balance = round2(balance + (e.type === 'IN' ? e.amount : -e.amount))
    map.set(e.id, balance)
  }
  return map
}

export interface EntryFilters {
  type: 'all' | EntryType
  method: string // 'all' or a method name
  from: IsoDate | ''
  to: IsoDate | ''
  query: string
}

export const EMPTY_FILTERS: EntryFilters = { type: 'all', method: 'all', from: '', to: '', query: '' }

export function hasActiveFilters(f: EntryFilters): boolean {
  return f.type !== 'all' || f.method !== 'all' || !!f.from || !!f.to || !!f.query.trim()
}

export function filterEntries(entries: Entry[], f: EntryFilters): Entry[] {
  const q = f.query.trim().toLowerCase()
  return entries.filter(
    (e) =>
      (f.type === 'all' || e.type === f.type) &&
      (f.method === 'all' || e.method === f.method) &&
      (!f.from || e.date >= f.from) &&
      (!f.to || e.date <= f.to) &&
      (!q || e.notes.toLowerCase().includes(q) || e.method.toLowerCase().includes(q)),
  )
}

export function sortEntries(entries: Entry[], dir: 'asc' | 'desc'): Entry[] {
  const sorted = [...entries].sort(chronological)
  return dir === 'desc' ? sorted.reverse() : sorted
}

export type DatePresetKey = 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear'

export interface DatePreset {
  key: DatePresetKey
  label: string
  from: IsoDate
  to: IsoDate
}

export function datePresets(today: IsoDate): DatePreset[] {
  const view = monthOf(today)
  const last = shiftMonth(view, -1)
  return [
    { key: 'thisMonth', label: 'This month', from: isoOf(view.year, view.month, 1), to: today },
    { key: 'lastMonth', label: 'Last month', from: isoOf(last.year, last.month, 1), to: isoOf(last.year, last.month + 1, 0) },
    { key: 'last30', label: 'Last 30 days', from: addDays(today, -29), to: today },
    { key: 'last90', label: 'Last 90 days', from: addDays(today, -89), to: today },
    { key: 'thisYear', label: 'This year', from: `${view.year}-01-01`, to: today },
  ]
}

/** Sort key for party lists: most recent activity first, then by name. */
export function byRecentActivity(
  a: { party: Party; totals: PartyTotals },
  b: { party: Party; totals: PartyTotals },
): number {
  const da = a.totals.lastDate ?? ''
  const db = b.totals.lastDate ?? ''
  if (da !== db) return da < db ? 1 : -1
  return a.party.name.localeCompare(b.party.name)
}

export type BalanceDirection = 'in' | 'out' | 'settled'

export function balanceDirection(balance: number): BalanceDirection {
  return balance > 0 ? 'in' : balance < 0 ? 'out' : 'settled'
}

/** Net in means the party paid you more, so settling it up means you'll give. */
export const BALANCE_LABELS: Record<BalanceWording, Record<BalanceDirection, string>> = {
  net: { in: 'Net in', out: 'Net out', settled: 'Settled' },
  cash: { in: 'Cash in', out: 'Cash out', settled: 'Settled' },
  settle: { in: "You'll give", out: "You'll get", settled: 'Settled' },
}

/** For tight spots like sidebar rows: "You'll give" shortens to "Give". */
const SHORT_BALANCE_LABELS: Record<BalanceWording, Record<BalanceDirection, string>> = {
  net: BALANCE_LABELS.net,
  cash: BALANCE_LABELS.cash,
  settle: { in: 'Give', out: 'Get', settled: 'Settled' },
}

export function balanceCaption(balance: number, wording: BalanceWording = 'net', opts?: { short?: boolean }): string {
  return (opts?.short ? SHORT_BALANCE_LABELS : BALANCE_LABELS)[wording][balanceDirection(balance)]
}

/** What a party's screens call its IN / OUT entries: a label (cards, columns, tabs) and an action (buttons). */
export interface EntryLabels {
  in: string
  out: string
  inAction: string
  outAction: string
}

/** A party's custom label replaces both forms for its side; each side falls back on its own. */
export function entryLabels(party: Pick<Party, 'inLabel' | 'outLabel'>): EntryLabels {
  const inLabel = party.inLabel.trim()
  const outLabel = party.outLabel.trim()
  return {
    in: inLabel || 'Cash in',
    out: outLabel || 'Cash out',
    inAction: inLabel || 'Get cash',
    outAction: outLabel || 'Give cash',
  }
}

export interface BalanceSums {
  /** Sum of positive balances (net in) and how many parties have one. */
  in: number
  inCount: number
  /** Sum of negative balances as a positive number (net out) and how many parties have one. */
  out: number
  outCount: number
}

export function sumBalances(list: PartyTotals[]): BalanceSums {
  const sums: BalanceSums = { in: 0, inCount: 0, out: 0, outCount: 0 }
  for (const t of list) {
    if (t.balance > 0) {
      sums.in = round2(sums.in + t.balance)
      sums.inCount++
    } else if (t.balance < 0) {
      sums.out = round2(sums.out - t.balance)
      sums.outCount++
    }
  }
  return sums
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
