import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDate,
  formatRange,
  isIsoDate,
  monthGrid,
  shiftMonth,
  todayIso,
} from './dates'

describe('dates', () => {
  it('validates real calendar dates only', () => {
    expect(isIsoDate('2026-10-23')).toBe(true)
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('23/10/2026')).toBe(false)
    expect(isIsoDate(20261023)).toBe(false)
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('uses the local calendar for today', () => {
    expect(todayIso(new Date(2026, 10, 2, 23, 59))).toBe('2026-11-02')
  })

  it('shifts months with wrap-around', () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 })
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 })
  })

  it('builds a Sunday-first grid padded to whole weeks', () => {
    const grid = monthGrid({ year: 2026, month: 9 }) // October 2026 starts on a Thursday
    expect(grid.length % 7).toBe(0)
    expect(grid.slice(0, 4)).toEqual([null, null, null, null])
    expect(grid[4]).toBe('2026-10-01')
    expect(grid.filter(Boolean)).toHaveLength(31)
  })

  it('formats dates in each supported format', () => {
    expect(formatDate('2026-10-03')).toBe('3 Oct 2026')
    expect(formatDate('2026-10-03', 'dmy')).toBe('03/10/2026')
    expect(formatDate('2026-10-03', 'mdy')).toBe('10/03/2026')
    expect(formatDate('2026-10-03', 'iso')).toBe('2026-10-03')
    expect(formatDate('')).toBe('—')
  })

  it('formats ranges compactly within a year', () => {
    expect(formatRange('2026-10-05', '2026-10-20')).toBe('5 Oct – 20 Oct 2026')
    expect(formatRange('2025-12-20', '2026-01-05')).toBe('20 Dec 2025 – 5 Jan 2026')
    expect(formatRange('2026-10-05', '2026-10-05')).toBe('5 Oct 2026')
  })
})
