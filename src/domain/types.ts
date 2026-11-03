import type { DateFormat, IsoDate } from '@/lib/dates'

/** IN = cash you got (cash in). OUT = cash you gave (cash out). */
export type EntryType = 'IN' | 'OUT'

export interface Entry {
  /** Stable id stored in the sheet's hidden ID column. */
  id: string
  date: IsoDate
  type: EntryType
  amount: number
  method: string
  notes: string
  createdAt: string
  updatedAt: string
  /** 1-based row in the party's tab. Used to address the row for edits. */
  row: number
}

export interface EntryInput {
  date: IsoDate
  type: EntryType
  amount: number
  method: string
  notes: string
}

export type PartyStatus = 'active' | 'archived'

export interface Party {
  id: string
  /** Google Sheets tab id (gid). Stable across renames. */
  sheetId: number
  /** Party name; also the tab title. */
  name: string
  status: PartyStatus
  createdAt: string
  archivedAt: string | null
  phone: string
  email: string
  defaultMethod: string
  notes: string
  /** Display names for OUT / IN entries on this party's screens. '' means Cash out / Cash in. */
  outLabel: string
  inLabel: string
  /** 1-based row of this party in the __Settings registry table. */
  registryRow: number
  /** True when the registry points at a tab that no longer exists. */
  missing?: boolean
}

export interface PartyInput {
  name: string
  phone: string
  email: string
  defaultMethod: string
  notes: string
  outLabel: string
  inLabel: string
}

/** Copies only the editable fields, so stray properties never overwrite status or ids. */
export function pickPartyInput(input: PartyInput): PartyInput {
  return {
    name: input.name,
    phone: input.phone,
    email: input.email,
    defaultMethod: input.defaultMethod,
    notes: input.notes,
    outLabel: input.outLabel,
    inLabel: input.inLabel,
  }
}

/** net = Net in / Net out. settle = You'll give / You'll get (what squares the party up). */
export type BalanceWording = 'net' | 'cash' | 'settle'

/** What the sidebar tiles total: outstanding balances, or cash you got / gave. */
export type SidebarTotals = 'balances' | 'cash'

/** Sidebar party order: by last entry date, name, or the amount left to settle. */
export type PartySortKey = 'lastEntry' | 'name' | 'settle'

export type SortDir = 'asc' | 'desc'

export type LedgerPageSize = 25 | 50 | 100

export interface GlobalSettings {
  schemaVersion: 1
  currency: string
  dateFormat: DateFormat
  paymentMethods: string[]
  allowFutureDates: boolean
  balanceWording: BalanceWording
  sidebarTotals: SidebarTotals
  partySort: PartySortKey
  partySortDir: SortDir
  /** Date order of a party's ledger. */
  ledgerSortDir: SortDir
  ledgerPageSize: LedgerPageSize
}

export interface Workspace {
  spreadsheetId: string
  title: string
  url: string
  settings: GlobalSettings
  /** Tab id of __Settings. */
  settingsSheetId: number
  parties: Party[]
  /** Total number of tabs in the spreadsheet, shown in the UI. */
  tabCount: number
}

export interface SpreadsheetRef {
  id: string
  name: string
  url: string
  modifiedTime?: string
}

/** Entries per party id. */
export type Ledgers = Record<string, Entry[]>

export interface PartyTotals {
  totalIn: number
  totalOut: number
  /** totalIn - totalOut */
  balance: number
  count: number
  inCount: number
  outCount: number
  lastDate: IsoDate | null
}
