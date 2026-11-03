import { isIsoDate, type DateFormat, type IsoDate } from '@/lib/dates'
import { parseAmount } from '@/lib/money'
import type {
  BalanceWording,
  EntryInput,
  EntryType,
  GlobalSettings,
  LedgerPageSize,
  PartyInput,
  PartySortKey,
  SortDir,
} from './types'

export const SETTINGS_TAB = '__Settings'
export const DEFAULT_PAYMENT_METHODS = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card']

export const DEFAULT_SETTINGS: GlobalSettings = {
  schemaVersion: 1,
  currency: 'INR',
  dateFormat: 'text',
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  allowFutureDates: false,
  balanceWording: 'net',
  sidebarTotals: 'balances',
  partySort: 'lastEntry',
  partySortDir: 'desc',
  ledgerSortDir: 'desc',
  ledgerPageSize: 25,
}

export const LIMITS = {
  partyName: 80,
  notes: 500,
  partyNotes: 300,
  method: 30,
  entryLabel: 20,
  maxAmount: 9_999_999_999,
} as const

// ---------------------------------------------------------------------------
// Stored JSON (cell A1). Parsed leniently: a hand-edited or partial value falls
// back to defaults instead of breaking the app.
// ---------------------------------------------------------------------------

const DATE_FORMATS: DateFormat[] = ['text', 'dmy', 'mdy', 'iso']
const BALANCE_WORDINGS: BalanceWording[] = ['net', 'cash', 'settle']
const PARTY_SORT_KEYS: PartySortKey[] = ['lastEntry', 'name', 'settle']
export const LEDGER_PAGE_SIZES: LedgerPageSize[] = [25, 50, 100]

/** The value if it is one of `allowed`, otherwise the fallback. */
function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

const sortDir = (value: unknown, fallback: SortDir): SortDir => oneOf(value, ['asc', 'desc'], fallback)

function asObject(raw: unknown): Record<string, unknown> {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = raw.trim() ? JSON.parse(raw) : {}
    } catch {
      value = {}
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

const str = (o: Record<string, unknown>, key: string) => (typeof o[key] === 'string' ? (o[key] as string) : '')

export function parseGlobalSettings(raw: unknown): GlobalSettings {
  const o = asObject(raw)
  const currency = str(o, 'currency').trim().toUpperCase()
  const dateFormat = str(o, 'dateFormat') as DateFormat
  const methods = Array.isArray(o.paymentMethods)
    ? dedupe(
        o.paymentMethods
          .filter((m): m is string => typeof m === 'string')
          .map((m) => m.trim())
          .filter((m) => m.length > 0 && m.length <= LIMITS.method),
      )
    : []
  return {
    schemaVersion: 1,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : DEFAULT_SETTINGS.currency,
    dateFormat: DATE_FORMATS.includes(dateFormat) ? dateFormat : DEFAULT_SETTINGS.dateFormat,
    paymentMethods: methods.length > 0 ? methods : [...DEFAULT_PAYMENT_METHODS],
    allowFutureDates: o.allowFutureDates === true,
    balanceWording: oneOf(o.balanceWording, BALANCE_WORDINGS, DEFAULT_SETTINGS.balanceWording),
    sidebarTotals: o.sidebarTotals === 'cash' ? 'cash' : 'balances',
    partySort: oneOf(o.partySort, PARTY_SORT_KEYS, DEFAULT_SETTINGS.partySort),
    partySortDir: sortDir(o.partySortDir, DEFAULT_SETTINGS.partySortDir),
    ledgerSortDir: sortDir(o.ledgerSortDir, DEFAULT_SETTINGS.ledgerSortDir),
    ledgerPageSize: oneOf(o.ledgerPageSize, LEDGER_PAGE_SIZES, DEFAULT_SETTINGS.ledgerPageSize),
  }
}

export interface PartySettingsJson {
  schemaVersion: 1
  partyId: string
  name: string
  phone: string
  email: string
  defaultPaymentMethod: string
  notes: string
  createdAt: string
  outLabel: string
  inLabel: string
}

export function parsePartySettings(raw: unknown): PartySettingsJson {
  const o = asObject(raw)
  return {
    schemaVersion: 1,
    partyId: str(o, 'partyId'),
    name: str(o, 'name'),
    phone: str(o, 'phone'),
    email: str(o, 'email'),
    defaultPaymentMethod: str(o, 'defaultPaymentMethod'),
    notes: str(o, 'notes'),
    createdAt: str(o, 'createdAt'),
    outLabel: str(o, 'outLabel'),
    inLabel: str(o, 'inLabel'),
  }
}

// ---------------------------------------------------------------------------
// Form validation. Each returns either a clean value or field errors.
// ---------------------------------------------------------------------------

export type FieldErrors<K extends string> = Partial<Record<K, string>>
export type Validated<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> }

export interface EntryDraft {
  type: EntryType
  amount: string
  date: IsoDate
  method: string
  notes: string
}

export function validateEntry(
  draft: EntryDraft,
  ctx: { today: IsoDate; allowFutureDates: boolean; methods: string[] },
): Validated<EntryInput, keyof EntryDraft> {
  const errors: FieldErrors<keyof EntryDraft> = {}
  const amount = parseAmount(draft.amount)
  if (!draft.amount.trim()) errors.amount = 'Enter an amount.'
  else if (amount === null) errors.amount = 'Numbers only, up to 2 decimals.'
  else if (amount <= 0) errors.amount = 'Amount must be more than 0.'
  else if (amount > LIMITS.maxAmount) errors.amount = 'That amount looks too large.'

  if (!isIsoDate(draft.date)) errors.date = 'Pick a valid date.'
  else if (!ctx.allowFutureDates && draft.date > ctx.today) errors.date = 'Date cannot be in the future.'

  if (draft.type !== 'IN' && draft.type !== 'OUT') errors.type = 'Choose You gave or You got.'
  if (!draft.method.trim()) errors.method = 'Choose a payment method.'
  if (draft.notes.length > LIMITS.notes) errors.notes = `Keep the note under ${LIMITS.notes} characters.`

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      type: draft.type,
      amount: amount as number,
      date: draft.date,
      method: draft.method.trim(),
      notes: draft.notes.trim(),
    },
  }
}

const PHONE_RE = /^\+?[\d\s()-]{6,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateParty(
  draft: PartyInput,
  ctx: { otherNames: string[] },
): Validated<PartyInput, keyof PartyInput> {
  const errors: FieldErrors<keyof PartyInput> = {}
  const name = draft.name.trim().replace(/\s+/g, ' ')
  if (!name) errors.name = 'Enter a party name.'
  else if (name.length > LIMITS.partyName) errors.name = `Keep the name under ${LIMITS.partyName} characters.`
  else if (name.toLowerCase() === SETTINGS_TAB.toLowerCase()) errors.name = 'That name is reserved.'
  else if (ctx.otherNames.some((n) => n.toLowerCase() === name.toLowerCase()))
    errors.name = 'Another party already uses this name.'

  const phone = draft.phone.trim()
  if (phone && !PHONE_RE.test(phone)) errors.phone = 'Use digits, spaces, + or - only.'
  const email = draft.email.trim()
  if (email && !EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'
  if (draft.notes.length > LIMITS.partyNotes) errors.notes = `Keep notes under ${LIMITS.partyNotes} characters.`

  const outLabel = draft.outLabel.trim().replace(/\s+/g, ' ')
  const inLabel = draft.inLabel.trim().replace(/\s+/g, ' ')
  const tooLong = `Keep it under ${LIMITS.entryLabel} characters.`
  if (outLabel.length > LIMITS.entryLabel) errors.outLabel = tooLong
  if (inLabel.length > LIMITS.entryLabel) errors.inLabel = tooLong
  else if (inLabel && inLabel.toLowerCase() === outLabel.toLowerCase()) errors.inLabel = 'Use a different label for each side.'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: { name, phone, email, defaultMethod: draft.defaultMethod.trim(), notes: draft.notes.trim(), outLabel, inLabel },
  }
}

export function validateMethodName(name: string, existing: string[]): string | null {
  const clean = name.trim()
  if (!clean) return 'Type a method name first.'
  if (clean.length > LIMITS.method) return `Keep the name under ${LIMITS.method} characters.`
  if (existing.some((m) => m.toLowerCase() === clean.toLowerCase())) return `${clean} is already in the list.`
  return null
}

function dedupe(list: string[]): string[] {
  const seen = new Set<string>()
  return list.filter((item) => {
    const key = item.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
