import { describe, expect, it } from 'vitest'
import { quoteTitle, rangeOf } from './layout'
import {
  buildParty,
  cellDate,
  entryToRow,
  parseUpdatedRow,
  rowToEntry,
  rowToRegistry,
  rowsToEntries,
  serialToIso,
} from './mappers'

describe('layout helpers', () => {
  it('quotes tab titles for A1 notation', () => {
    expect(quoteTitle("O'Brien & Co")).toBe("'O''Brien & Co'")
    expect(rangeOf('Sharma Traders', 'A6:H')).toBe("'Sharma Traders'!A6:H")
  })
})

describe('entry rows', () => {
  const row = ['2026-10-18', 'IN', 8000, 'Cash', 'Part payment', 'ent_1', '2026-10-18T10:00:00Z', '2026-10-18T10:00:00Z']

  it('round-trips an entry', () => {
    const entry = rowToEntry(row, 28)!
    expect(entry).toMatchObject({ id: 'ent_1', date: '2026-10-18', type: 'IN', amount: 8000, row: 28 })
    expect(entryToRow(entry)).toEqual(row)
  })

  it('reads values typed by hand into the sheet', () => {
    expect(serialToIso(46313)).toBe('2026-10-18')
    expect(cellDate(46313)).toBe('2026-10-18')
    const typed = rowToEntry(['2026-10-18', 'out', '1,250', 'UPI', 'fuel'], 40)!
    expect(typed).toMatchObject({ type: 'OUT', amount: 1250, id: 'row-40' })
  })

  it('skips blank rows and reports unreadable ones', () => {
    const { entries, skippedRows } = rowsToEntries([row, [], ['', ''], ['someday', 'IN', 5], ['2026-10-19', 'MAYBE', 5]])
    expect(entries).toHaveLength(1)
    expect(skippedRows).toEqual([9, 10])
  })

  it('parses the row number from an append response', () => {
    expect(parseUpdatedRow("'Sharma Traders'!A30:H30")).toBe(30)
    expect(() => parseUpdatedRow('nonsense')).toThrow()
  })
})

describe('registry rows', () => {
  it('reads a registry row and ignores incomplete ones', () => {
    expect(rowToRegistry(['pty_1', 123, 'Sharma Traders', 'ARCHIVED', '2026-05-28', '2026-11-01'], 4)).toEqual({
      id: 'pty_1',
      sheetId: 123,
      name: 'Sharma Traders',
      status: 'archived',
      createdAt: '2026-05-28',
      archivedAt: '2026-11-01',
      registryRow: 4,
    })
    expect(rowToRegistry(['', 5], 5)).toBeNull()
    expect(rowToRegistry(['pty_2', 'not a number'], 6)).toBeNull()
  })

  it('uses the live tab title as the party name and marks missing tabs', () => {
    const reg = rowToRegistry(['pty_1', 123, 'Old name', 'active', '2026-05-28', ''], 4)!
    expect(buildParty(reg, { title: 'Renamed in Sheets' }, '{"phone":"123","outLabel":"You paid"}', 'UPI')).toMatchObject({
      name: 'Renamed in Sheets',
      phone: '123',
      defaultMethod: 'UPI',
      outLabel: 'You paid',
      inLabel: '',
      missing: false,
    })
    expect(buildParty(reg, undefined, '', 'UPI')).toMatchObject({ name: 'Old name', missing: true })
  })
})
