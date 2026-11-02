import type {
  Entry,
  EntryInput,
  GlobalSettings,
  Ledgers,
  Party,
  PartyInput,
  SpreadsheetRef,
  Workspace,
} from '@/domain/types'

export interface LedgerData {
  /** Entries per party id. Parties with no entries map to []. */
  byParty: Ledgers
  /** Rows per party id that have content but could not be read. */
  skippedRows: Record<string, number[]>
}

/**
 * Everything the UI needs from storage. Two implementations:
 *  - SheetsBackend: the real thing, Google Sheets + Drive
 *  - DemoBackend: browser-only sample data for trying the app
 */
export interface Backend {
  readonly kind: 'google' | 'demo'
  listSpreadsheets(): Promise<SpreadsheetRef[]>
  createSpreadsheet(title: string): Promise<SpreadsheetRef>
  /** Adds the __Settings tab to an existing spreadsheet. No-op if present. */
  initializeSpreadsheet(spreadsheetId: string): Promise<void>
  loadWorkspace(spreadsheetId: string): Promise<Workspace>
  loadLedgers(ws: Workspace): Promise<LedgerData>
  addParty(ws: Workspace, input: PartyInput): Promise<Party>
  updateParty(ws: Workspace, party: Party, input: PartyInput): Promise<Party>
  setPartyArchived(ws: Workspace, party: Party, archived: boolean): Promise<Party>
  addEntry(ws: Workspace, party: Party, input: EntryInput): Promise<Entry>
  updateEntry(ws: Workspace, party: Party, entry: Entry, input: EntryInput): Promise<Entry>
  saveSettings(ws: Workspace, settings: GlobalSettings): Promise<GlobalSettings>
}
