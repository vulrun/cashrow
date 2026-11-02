import { addDays, isIsoDate, type IsoDate } from '@/lib/dates'
import { parsePartySettings } from '@/domain/schemas'
import type { Entry, EntryType, GlobalSettings, Party, PartyStatus } from '@/domain/types'
import type { CellValue } from '@/google/sheetsApi'
import { COL, PARTY_TAB, REGISTRY } from './layout'

// ---------------------------------------------------------------------------
// Cells
// ---------------------------------------------------------------------------

export function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

/** Google Sheets date serial (days since 1899-12-30) to ISO date. */
export function serialToIso(serial: number): IsoDate {
  return addDays('1899-12-30', Math.floor(serial))
}

/**
 * Reads a date cell. The app writes ISO text ("2026-10-23"), but a person editing
 * the sheet may type a real date, which comes back as a serial number. Anything
 * else (for example "23/10/2026", which is ambiguous) is treated as unreadable.
 */
export function cellDate(value: unknown): IsoDate | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return serialToIso(value)
  const text = cellText(value)
  if (!text) return null
  // "2026-10-23" or a timestamp such as "2026-10-23T10:00:00Z"
  const iso = text.slice(0, 10)
  return isIsoDate(iso) ? iso : null
}

export function cellAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
  const text = cellText(value).replace(/[,\s₹$€£]/g, '')
  if (!text) return null
  const n = Number(text)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export function cellType(value: unknown): EntryType | null {
  const t = cellText(value).toUpperCase()
  if (['IN', 'CASH IN', 'GOT', 'YOU GOT', 'CREDIT'].includes(t)) return 'IN'
  if (['OUT', 'CASH OUT', 'GAVE', 'YOU GAVE', 'DEBIT'].includes(t)) return 'OUT'
  return null
}

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/** Prefix for rows that have no ID yet (typed into the sheet by hand). */
export const SYNTHETIC_ID_PREFIX = 'row-'

export function isSyntheticId(id: string): boolean {
  return id.startsWith(SYNTHETIC_ID_PREFIX)
}

function isBlankRow(row: unknown[] | undefined): boolean {
  return !row || row.every((c) => cellText(c) === '')
}

export function rowToEntry(row: CellValue[] | undefined, rowNumber: number): Entry | null {
  if (!row || isBlankRow(row)) return null
  const date = cellDate(row[COL.date])
  const type = cellType(row[COL.type])
  const amount = cellAmount(row[COL.amount])
  if (!date || !type || amount === null || amount < 0) return null
  return {
    id: cellText(row[COL.id]) || `${SYNTHETIC_ID_PREFIX}${rowNumber}`,
    date,
    type,
    amount,
    method: cellText(row[COL.method]),
    notes: cellText(row[COL.notes]),
    createdAt: cellText(row[COL.createdAt]),
    updatedAt: cellText(row[COL.updatedAt]),
    row: rowNumber,
  }
}

export interface ParsedRows {
  entries: Entry[]
  /** Row numbers that have content but could not be read as an entry. */
  skippedRows: number[]
}

export function rowsToEntries(values: CellValue[][] | undefined, firstRow = PARTY_TAB.firstDataRow): ParsedRows {
  const entries: Entry[] = []
  const skippedRows: number[] = []
  ;(values ?? []).forEach((row, i) => {
    const rowNumber = firstRow + i
    if (isBlankRow(row)) return
    const entry = rowToEntry(row, rowNumber)
    if (entry) entries.push(entry)
    else skippedRows.push(rowNumber)
  })
  return { entries, skippedRows }
}

export function entryToRow(e: Omit<Entry, 'row'>): CellValue[] {
  const row: CellValue[] = []
  row[COL.date] = e.date
  row[COL.type] = e.type
  row[COL.amount] = e.amount
  row[COL.method] = e.method
  row[COL.notes] = e.notes
  row[COL.id] = e.id
  row[COL.createdAt] = e.createdAt
  row[COL.updatedAt] = e.updatedAt
  return row
}

/** "'Sharma Traders'!A30:H30" -> 30 */
export function parseUpdatedRow(updatedRange: string): number {
  const match = /![A-Z]+(\d+)/.exec(updatedRange)
  if (!match) throw new Error(`Unexpected range from Google Sheets: ${updatedRange}`)
  return Number(match[1])
}

// ---------------------------------------------------------------------------
// Registry (__Settings rows 4+)
// ---------------------------------------------------------------------------

export interface RegistryRow {
  id: string
  sheetId: number
  name: string
  status: PartyStatus
  createdAt: string
  archivedAt: string | null
  registryRow: number
}

export function rowToRegistry(row: CellValue[] | undefined, rowNumber: number): RegistryRow | null {
  if (!row || isBlankRow(row)) return null
  const id = cellText(row[0])
  const sheetId = Number(row[1])
  if (!id || !Number.isInteger(sheetId)) return null
  const status = cellText(row[3]).toLowerCase() === 'archived' ? 'archived' : 'active'
  return {
    id,
    sheetId,
    name: cellText(row[2]),
    status,
    createdAt: cellText(row[4]),
    archivedAt: cellText(row[5]) || null,
    registryRow: rowNumber,
  }
}

export function registryValues(p: Pick<Party, 'id' | 'sheetId' | 'name' | 'status' | 'createdAt' | 'archivedAt'>): CellValue[] {
  return [p.id, p.sheetId, p.name, p.status, p.createdAt, p.archivedAt ?? '']
}

export function registryRowNumber(index: number): number {
  return REGISTRY.firstRow + index
}

// ---------------------------------------------------------------------------
// Settings JSON (cell A1)
// ---------------------------------------------------------------------------

export function partySettingsJson(
  p: Pick<Party, 'id' | 'name' | 'phone' | 'email' | 'defaultMethod' | 'notes' | 'createdAt' | 'outLabel' | 'inLabel'>,
): string {
  return JSON.stringify({
    schemaVersion: 1,
    partyId: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
    defaultPaymentMethod: p.defaultMethod,
    notes: p.notes,
    createdAt: p.createdAt,
    outLabel: p.outLabel,
    inLabel: p.inLabel,
  })
}

export function globalSettingsJson(s: GlobalSettings): string {
  return JSON.stringify({
    schemaVersion: 1,
    currency: s.currency,
    dateFormat: s.dateFormat,
    paymentMethods: s.paymentMethods,
    allowFutureDates: s.allowFutureDates,
    balanceWording: s.balanceWording,
    sidebarTotals: s.sidebarTotals,
  })
}

/** Combines a registry row, the tab it points at, and the tab's A1 JSON into a Party. */
export function buildParty(
  reg: RegistryRow,
  tab: { title: string } | undefined,
  settingsCell: unknown,
  fallbackMethod: string,
): Party {
  const json = parsePartySettings(settingsCell)
  return {
    id: reg.id,
    sheetId: reg.sheetId,
    name: tab?.title ?? (reg.name || json.name),
    status: reg.status,
    createdAt: reg.createdAt || json.createdAt,
    archivedAt: reg.archivedAt,
    phone: json.phone,
    email: json.email,
    defaultMethod: json.defaultPaymentMethod || fallbackMethod,
    notes: json.notes,
    outLabel: json.outLabel,
    inLabel: json.inLabel,
    registryRow: reg.registryRow,
    missing: !tab,
  }
}
