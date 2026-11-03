import { describe, expect, it } from 'vitest'
import {
  balanceCaption,
  computeTotals,
  datePresets,
  entryLabels,
  filterEntries,
  runningBalances,
  sortEntries,
  sortParties,
  sumBalances,
  sumTotals,
  EMPTY_FILTERS,
} from './ledger'
import type { Entry, Party } from './types'

const e = (id: string, date: string, type: 'IN' | 'OUT', amount: number, row: number, extra: Partial<Entry> = {}): Entry => ({
  id,
  date,
  type,
  amount,
  method: 'UPI',
  notes: '',
  createdAt: '',
  updatedAt: '',
  row,
  ...extra,
})

const entries = [
  e('a', '2026-10-04', 'IN', 7500, 6, { method: 'Bank transfer', notes: 'Part payment, invoice #1255' }),
  e('b', '2026-10-03', 'OUT', 5000, 7, { method: 'Cash', notes: 'Credit note #1206' }),
  e('c', '2026-10-04', 'IN', 10250, 8, { notes: 'Balance cleared' }),
]

describe('ledger', () => {
  it('computes totals and the latest date', () => {
    expect(computeTotals(entries)).toEqual({
      totalIn: 17750,
      totalOut: 5000,
      balance: 12750,
      count: 3,
      inCount: 2,
      outCount: 1,
      lastDate: '2026-10-04',
    })
  })

  it('avoids floating point drift', () => {
    expect(computeTotals([e('x', '2026-01-01', 'IN', 0.1, 6), e('y', '2026-01-01', 'IN', 0.2, 7)]).totalIn).toBe(0.3)
  })

  it('accumulates running balances oldest first, same-day by sheet row', () => {
    const b = runningBalances(entries)
    expect(b.get('b')).toBe(-5000)
    expect(b.get('a')).toBe(2500)
    expect(b.get('c')).toBe(12750)
  })

  it('sorts newest first by default order rules', () => {
    expect(sortEntries(entries, 'desc').map((x) => x.id)).toEqual(['c', 'a', 'b'])
    expect(sortEntries(entries, 'asc').map((x) => x.id)).toEqual(['b', 'a', 'c'])
  })

  it('filters by type, method, dates and text', () => {
    expect(filterEntries(entries, { ...EMPTY_FILTERS, type: 'OUT' }).map((x) => x.id)).toEqual(['b'])
    expect(filterEntries(entries, { ...EMPTY_FILTERS, method: 'UPI' }).map((x) => x.id)).toEqual(['c'])
    expect(filterEntries(entries, { ...EMPTY_FILTERS, from: '2026-10-04', to: '2026-10-04' })).toHaveLength(2)
    expect(filterEntries(entries, { ...EMPTY_FILTERS, query: 'invoice' }).map((x) => x.id)).toEqual(['a'])
  })

  it('sums party totals', () => {
    const t = sumTotals([computeTotals(entries), computeTotals([e('z', '2026-11-01', 'OUT', 250, 6)])])
    expect(t).toMatchObject({ totalIn: 17750, totalOut: 5250, balance: 12500, count: 4, lastDate: '2026-11-01' })
  })

  it('builds date presets relative to today', () => {
    const p = Object.fromEntries(datePresets('2026-11-02').map((x) => [x.key, [x.from, x.to]]))
    expect(p.thisMonth).toEqual(['2026-11-01', '2026-11-02'])
    expect(p.lastMonth).toEqual(['2026-10-01', '2026-10-31'])
    expect(p.last30).toEqual(['2026-10-04', '2026-11-02'])
    expect(p.thisYear).toEqual(['2026-01-01', '2026-11-02'])
  })

  it('labels balance direction', () => {
    expect(balanceCaption(10)).toBe('Net in')
    expect(balanceCaption(-1)).toBe('Net out')
    expect(balanceCaption(0)).toBe('Settled')
  })

  it('labels balance direction in settlement wording', () => {
    expect(balanceCaption(10, 'settle')).toBe("You'll give")
    expect(balanceCaption(-1, 'settle')).toBe("You'll get")
    expect(balanceCaption(0, 'settle')).toBe('Settled')
    expect(balanceCaption(10, 'settle', { short: true })).toBe('Give')
    expect(balanceCaption(-1, 'settle', { short: true })).toBe('Get')
    expect(balanceCaption(-1, 'net', { short: true })).toBe('Net out')
  })

  it('names entry types per party, falling back to cash in / cash out per side', () => {
    expect(entryLabels({ outLabel: '', inLabel: '' })).toEqual({ in: 'Cash in', out: 'Cash out', inAction: 'Get cash', outAction: 'Give cash' })
    expect(entryLabels({ outLabel: 'You paid', inLabel: 'You owe' })).toEqual({
      in: 'You owe',
      out: 'You paid',
      inAction: 'You owe',
      outAction: 'You paid',
    })
    expect(entryLabels({ outLabel: 'You paid', inLabel: ' ' })).toMatchObject({ in: 'Cash in', inAction: 'Get cash', out: 'You paid' })
  })

  it('sums balances to settle by direction', () => {
    const t = (balance: number) => ({ ...computeTotals([]), balance })
    expect(sumBalances([t(100.1), t(-40), t(0), t(0.2), t(-9.99)])).toEqual({ in: 100.3, inCount: 2, out: 49.99, outCount: 2 })
    expect(sumBalances([])).toEqual({ in: 0, inCount: 0, out: 0, outCount: 0 })
  })

  describe('sortParties', () => {
    const p = (name: string, lastDate: string | null, balance: number) => ({
      party: { name } as Party,
      totals: { ...computeTotals([]), lastDate, balance },
    })
    const list = [
      p('beta', '2026-10-02', -300),
      p('Alpha', '2026-10-05', 120),
      p('Gamma', null, 0),
      p('delta', '2026-10-02', 300),
      p('Item 10', '2026-09-01', -5),
      p('Item 9', '2026-09-01', 5),
    ]
    const names = (by: Parameters<typeof sortParties>[1], dir: Parameters<typeof sortParties>[2]) =>
      sortParties(list, by, dir).map((s) => s.party.name)

    it('orders by last entry, ties by name, parties with no entries last', () => {
      expect(names('lastEntry', 'desc')).toEqual(['Alpha', 'beta', 'delta', 'Item 9', 'Item 10', 'Gamma'])
      expect(names('lastEntry', 'asc')).toEqual(['Item 9', 'Item 10', 'beta', 'delta', 'Alpha', 'Gamma'])
    })

    it('orders by name, ignoring case and reading numbers as numbers', () => {
      expect(names('name', 'asc')).toEqual(['Alpha', 'beta', 'delta', 'Gamma', 'Item 9', 'Item 10'])
      expect(names('name', 'desc')).toEqual(['Item 10', 'Item 9', 'Gamma', 'delta', 'beta', 'Alpha'])
    })

    it('orders by the amount left to settle in either direction, ties by name', () => {
      expect(names('settle', 'desc')).toEqual(['beta', 'delta', 'Alpha', 'Item 9', 'Item 10', 'Gamma'])
      expect(names('settle', 'asc')).toEqual(['Gamma', 'Item 9', 'Item 10', 'Alpha', 'beta', 'delta'])
    })

    it('does not change the input list', () => {
      const before = list.map((s) => s.party.name)
      sortParties(list, 'name', 'desc')
      expect(list.map((s) => s.party.name)).toEqual(before)
    })
  })
})
