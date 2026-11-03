import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS, balanceCaption, entryLabels } from '@/domain/ledger'
import type { Entry } from '@/domain/types'
import { formatDate } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { buildLedgerReport, fileName, filterSummary } from './ledgerReport'

const e = (id: string, date: string, type: 'IN' | 'OUT', amount: number, notes = ''): Entry => ({
  id,
  date,
  type,
  amount,
  method: 'UPI',
  notes,
  createdAt: '',
  updatedAt: '',
  row: 6,
})

const labels = entryLabels({ inLabel: '', outLabel: '' })
const fmt = {
  money: (n: number) => formatMoney(n, 'INR'),
  date: (iso: string | null | undefined) => formatDate(iso, 'iso'),
  caption: (balance: number) => balanceCaption(balance, 'net'),
}

describe('ledger report', () => {
  it('summarises the active filters', () => {
    const date = (iso: string) => iso
    expect(filterSummary(EMPTY_FILTERS, labels, date)).toBe('All entries')
    expect(
      filterSummary({ type: 'IN', method: 'UPI', from: '2026-10-01', to: '2026-10-31', query: ' rent ' }, labels, date),
    ).toBe('Cash in only · UPI · 2026-10-01 – 2026-10-31 · Matching “rent”')
    expect(filterSummary({ ...EMPTY_FILTERS, type: 'OUT', from: '2026-10-01' }, labels, date)).toBe('Cash out only · From 2026-10-01')
    expect(filterSummary({ ...EMPTY_FILTERS, to: '2026-10-31' }, labels, date)).toBe('Until 2026-10-31')
  })

  it('names the file after the party and date range, without unsafe characters', () => {
    expect(fileName('Sharma Traders', EMPTY_FILTERS, '2026-11-03')).toBe('Cashrow - Sharma Traders - 2026-11-03')
    expect(fileName('A/B: "C"', { ...EMPTY_FILTERS, from: '2026-10-01' }, '2026-11-03')).toBe(
      'Cashrow - A-B- -C- - 2026-10-01 to 2026-11-03',
    )
  })

  it('keeps the given row order and totals only the exported entries', () => {
    const entries = [e('b', '2026-10-05', 'OUT', 400, 'Diesel'), e('a', '2026-10-01', 'IN', 1000)]
    const report = buildLedgerReport({
      partyName: 'Sharma Traders',
      entries,
      balances: new Map([
        ['a', 1000],
        ['b', 600],
      ]),
      labels,
      filters: EMPTY_FILTERS,
      generatedOn: '2026-11-03',
      fmt,
    })
    expect(report.rows.map((r) => r.date)).toEqual(['2026-10-05', '2026-10-01'])
    expect(report.rows[0]).toMatchObject({ type: 'OUT', notes: 'Diesel', out: formatMoney(400, 'INR'), in: '–', balance: formatMoney(600, 'INR') })
    expect(report.rows[1]).toMatchObject({ out: '–', in: formatMoney(1000, 'INR') })
    expect(report.count).toBe('2 entries')
    expect(report.totals).toEqual([
      { label: 'Cash in', value: formatMoney(1000, 'INR'), tone: 'income' },
      { label: 'Cash out', value: formatMoney(400, 'INR'), tone: 'expense' },
      { label: 'Balance · Net in', value: formatMoney(600, 'INR'), tone: 'in' },
    ])
    expect(report.generated).toBe('Generated 2026-11-03')
  })
})
