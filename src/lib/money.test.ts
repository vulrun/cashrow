import { describe, expect, it } from 'vitest'
import { formatMoney, parseAmount } from './money'

describe('formatMoney', () => {
  it('uses Indian digit grouping for INR', () => {
    expect(formatMoney(124500, 'INR')).toBe('₹1,24,500')
    expect(formatMoney(1250.5, 'INR')).toBe('₹1,250.50')
  })

  it('uses Western grouping for USD and a real minus sign', () => {
    expect(formatMoney(124500, 'USD')).toBe('$124,500')
    expect(formatMoney(-41500, 'USD')).toBe('−$41,500')
  })

  it('adds a plus sign only when asked', () => {
    expect(formatMoney(500, 'INR', { signed: true })).toBe('+₹500')
    expect(formatMoney(0, 'INR', { signed: true })).toBe('₹0')
  })

  it('spaces letter-code symbols', () => {
    expect(formatMoney(1000, 'AED')).toBe('AED 1,000')
  })
})

describe('parseAmount', () => {
  it('accepts grouping separators and up to two decimals', () => {
    expect(parseAmount('1,24,500')).toBe(124500)
    expect(parseAmount(' 1 250.5 ')).toBe(1250.5)
    expect(parseAmount('99.99')).toBe(99.99)
  })

  it('rejects anything else', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount('-5')).toBeNull()
    expect(parseAmount('1.234')).toBeNull()
    expect(parseAmount('=SUM(A1)')).toBeNull()
  })
})
