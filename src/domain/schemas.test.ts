import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAYMENT_METHODS,
  parseGlobalSettings,
  parsePartySettings,
  validateEntry,
  validateMethodName,
  validateParty,
} from './schemas'

const ctx = { today: '2026-11-02', allowFutureDates: false, methods: DEFAULT_PAYMENT_METHODS }
const draft = { type: 'IN' as const, amount: '8000', date: '2026-10-18', method: 'Cash', notes: '  Part payment ' }

describe('validateEntry', () => {
  it('returns a clean value for valid input', () => {
    const r = validateEntry(draft, ctx)
    expect(r).toEqual({
      ok: true,
      value: { type: 'IN', amount: 8000, date: '2026-10-18', method: 'Cash', notes: 'Part payment' },
    })
  })

  it('reports each invalid field', () => {
    const r = validateEntry({ ...draft, amount: '0', date: '2026-11-05', method: '', notes: 'x'.repeat(501) }, ctx)
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['amount', 'date', 'method', 'notes'])
      expect(r.errors.date).toMatch(/future/)
    }
  })

  it('allows future dates when the setting is on', () => {
    expect(validateEntry({ ...draft, date: '2026-12-01' }, { ...ctx, allowFutureDates: true }).ok).toBe(true)
  })
})

describe('validateParty', () => {
  const base = { name: 'Sharma Traders', phone: '', email: '', defaultMethod: 'UPI', notes: '', outLabel: '', inLabel: '' }

  it('normalises whitespace in the name', () => {
    const r = validateParty({ ...base, name: '  Sharma   Traders ' }, { otherNames: [] })
    expect(r.ok && r.value.name).toBe('Sharma Traders')
  })

  it('rejects duplicate (case-insensitive) and reserved names', () => {
    expect(validateParty(base, { otherNames: ['sharma traders'] }).ok).toBe(false)
    expect(validateParty({ ...base, name: '__settings' }, { otherNames: [] }).ok).toBe(false)
  })

  it('checks phone and email only when given', () => {
    const r = validateParty({ ...base, phone: 'abc', email: 'nope' }, { otherNames: [] })
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['email', 'phone'])
    expect(validateParty({ ...base, phone: '+91 98300 41275', email: 'a@b.co' }, { otherNames: [] }).ok).toBe(true)
  })

  it('tidies entry labels and rejects long or matching ones', () => {
    const r = validateParty({ ...base, outLabel: '  You   paid ', inLabel: 'You owe' }, { otherNames: [] })
    expect(r.ok && [r.value.outLabel, r.value.inLabel]).toEqual(['You paid', 'You owe'])
    const long = validateParty({ ...base, outLabel: 'x'.repeat(21) }, { otherNames: [] })
    expect(!long.ok && Object.keys(long.errors)).toEqual(['outLabel'])
    const same = validateParty({ ...base, outLabel: 'Paid', inLabel: 'paid' }, { otherNames: [] })
    expect(!same.ok && Object.keys(same.errors)).toEqual(['inLabel'])
    expect(validateParty({ ...base, outLabel: 'You paid' }, { otherNames: [] }).ok).toBe(true)
  })
})

describe('validateMethodName', () => {
  it('blocks empty and duplicate names', () => {
    expect(validateMethodName('  ', ['UPI'])).toMatch(/Type/)
    expect(validateMethodName('upi', ['UPI'])).toMatch(/already/)
    expect(validateMethodName('NEFT', ['UPI'])).toBeNull()
  })
})

describe('stored JSON parsing', () => {
  it('falls back to defaults for missing or broken settings', () => {
    expect(parseGlobalSettings('')).toMatchObject({ currency: 'INR', dateFormat: 'text', allowFutureDates: false })
    expect(parseGlobalSettings('{not json')).toMatchObject({ currency: 'INR' })
    expect(parseGlobalSettings('{"currency":"usd","paymentMethods":[]}').currency).toBe('USD')
    expect(parseGlobalSettings('{"paymentMethods":[]}').paymentMethods).toEqual(DEFAULT_PAYMENT_METHODS)
  })

  it('keeps valid values and drops bad ones', () => {
    const s = parseGlobalSettings(
      JSON.stringify({ currency: 'EUR', dateFormat: 'iso', paymentMethods: ['UPI', 'upi', 7, ' NEFT '], allowFutureDates: true }),
    )
    expect(s).toEqual({
      schemaVersion: 1,
      currency: 'EUR',
      dateFormat: 'iso',
      paymentMethods: ['UPI', 'NEFT'],
      allowFutureDates: true,
      balanceWording: 'net',
      sidebarTotals: 'balances',
    })
  })

  it('reads display options and falls back on unknown values', () => {
    expect(parseGlobalSettings('{"balanceWording":"settle","sidebarTotals":"cash"}')).toMatchObject({
      balanceWording: 'settle',
      sidebarTotals: 'cash',
    })
    expect(parseGlobalSettings('{"balanceWording":"owe","sidebarTotals":1}')).toMatchObject({
      balanceWording: 'net',
      sidebarTotals: 'balances',
    })
  })

  it('reads party settings with empty-string defaults', () => {
    expect(parsePartySettings('{"phone":"123","notes":5}')).toMatchObject({ phone: '123', notes: '', email: '', outLabel: '', inLabel: '' })
    expect(parsePartySettings('{"outLabel":"You paid","inLabel":"You owe"}')).toMatchObject({ outLabel: 'You paid', inLabel: 'You owe' })
  })
})
