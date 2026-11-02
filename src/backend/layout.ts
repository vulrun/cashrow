/**
 * Where everything lives inside the spreadsheet. See docs/data-model.md.
 *
 * __Settings tab
 *   A1        global settings (JSON)
 *   A2        human note
 *   row 3     registry header: Party ID | Tab ID | Name | Status | Created At | Archived At
 *   row 4+    one row per party
 *
 * Party tab (one per party, titled with the party name)
 *   A1        party settings (JSON)
 *   row 2     insight labels
 *   row 3     insight formulas (for people reading the sheet; the app computes its own)
 *   row 5     entry header: Date | Type | Amount | Payment Method | Notes | ID | Created At | Updated At
 *   row 6+    entries, appended at the bottom. Columns F:H are hidden.
 */

export { SETTINGS_TAB } from '@/domain/schemas'

export const REGISTRY = {
  headerRow: 3,
  firstRow: 4,
  columns: ['Party ID', 'Tab ID', 'Name', 'Status', 'Created At', 'Archived At'],
  lastColumn: 'F',
} as const

export const PARTY_TAB = {
  settingsRow: 1,
  labelRow: 2,
  totalsRow: 3,
  headerRow: 5,
  firstDataRow: 6,
  columns: ['Date', 'Type', 'Amount', 'Payment Method', 'Notes', 'ID', 'Created At', 'Updated At'],
  lastColumn: 'H',
  /** 0-based index of the first technical column (ID). F:H are hidden. */
  firstHiddenColumn: 5,
  defaultRowCount: 1000,
} as const

export const COL = {
  date: 0,
  type: 1,
  amount: 2,
  method: 3,
  notes: 4,
  id: 5,
  createdAt: 6,
  updatedAt: 7,
} as const

export const INSIGHT_LABELS = ['Total in', 'Total out', 'Balance', 'Entries', 'Last entry'] as const

/** Formulas for row 3 of a party tab. Plain English function names and commas. */
export const INSIGHT_FORMULAS = [
  '=SUMIF(B6:B,"IN",C6:C)',
  '=SUMIF(B6:B,"OUT",C6:C)',
  '=A3-B3',
  '=COUNTA(F6:F)',
  '=IFERROR(INDEX(SORT(FILTER(A6:A,A6:A<>""),1,FALSE),1),"")',
] as const

/** Quotes a tab title for A1 notation: O'Brien -> 'O''Brien'. */
export function quoteTitle(title: string): string {
  return `'${title.replace(/'/g, "''")}'`
}

export function rangeOf(title: string, a1: string): string {
  return `${quoteTitle(title)}!${a1}`
}

export function entryRowRange(title: string, row: number): string {
  return rangeOf(title, `A${row}:${PARTY_TAB.lastColumn}${row}`)
}

export function ledgerRange(title: string): string {
  return rangeOf(title, `A${PARTY_TAB.firstDataRow}:${PARTY_TAB.lastColumn}`)
}
