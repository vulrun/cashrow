import { config } from '@/config/env'
import { nowStamp } from '@/lib/dates'
import { newId, newSheetId } from '@/lib/utils'
import { DEFAULT_SETTINGS, parseGlobalSettings } from '@/domain/schemas'
import {
  pickPartyInput,
  type Entry,
  type EntryInput,
  type GlobalSettings,
  type Party,
  type PartyInput,
  type SpreadsheetRef,
  type Workspace,
} from '@/domain/types'
import { ApiError } from '@/google/errors'
import { listAppSpreadsheets, markAsAppSpreadsheet } from '@/google/driveApi'
import * as sheets from '@/google/sheetsApi'
import type { BatchRequest, CellValue, SpreadsheetMeta } from '@/google/sheetsApi'
import {
  INSIGHT_FORMULAS,
  INSIGHT_LABELS,
  PARTY_TAB,
  REGISTRY,
  SETTINGS_TAB,
  entryRowRange,
  ledgerRange,
  rangeOf,
} from './layout'
import {
  buildParty,
  entryToRow,
  globalSettingsJson,
  isSyntheticId,
  parseUpdatedRow,
  partySettingsJson,
  registryValues,
  rowToEntry,
  rowToRegistry,
  rowsToEntries,
} from './mappers'
import type { Backend, LedgerData } from './types'

/** How many ranges to request per values:batchGet call (keeps URLs short). */
const BATCH_GET_CHUNK = 40

// ---------------------------------------------------------------------------
// Cell builders for batchUpdate requests
// ---------------------------------------------------------------------------

type CellData = Record<string, unknown>

const text = (value: string, bold = false): CellData => ({
  userEnteredValue: { stringValue: value },
  ...(bold ? { userEnteredFormat: { textFormat: { bold: true } } } : {}),
})
const formula = (value: string): CellData => ({ userEnteredValue: { formulaValue: value } })
const cell = (value: CellValue): CellData => {
  if (typeof value === 'number') return { userEnteredValue: { numberValue: value } }
  if (typeof value === 'boolean') return { userEnteredValue: { boolValue: value } }
  return { userEnteredValue: { stringValue: value ?? '' } }
}

function settingsTabRows(settings: GlobalSettings) {
  return [
    { values: [text(globalSettingsJson(settings))] },
    {
      values: [
        text(`Row 1 holds app settings (JSON). Rows below list your parties. Change them in ${config.appName}, not here.`),
      ],
    },
    { values: REGISTRY.columns.map((c) => text(c, true)) },
  ]
}

function partyTabRows(party: Party) {
  return [
    { values: [text(partySettingsJson(party))] },
    { values: INSIGHT_LABELS.map((l) => text(l, true)) },
    { values: INSIGHT_FORMULAS.map((f) => formula(f)) },
    { values: [] },
    { values: PARTY_TAB.columns.map((c) => text(c, true)) },
  ]
}

function addPartyTabRequests(party: Party, settingsSheetId: number): BatchRequest[] {
  return [
    {
      addSheet: {
        properties: {
          sheetId: party.sheetId,
          title: party.name,
          gridProperties: {
            rowCount: PARTY_TAB.defaultRowCount,
            columnCount: PARTY_TAB.columns.length,
            frozenRowCount: PARTY_TAB.headerRow,
          },
        },
      },
    },
    {
      updateCells: {
        start: { sheetId: party.sheetId, rowIndex: 0, columnIndex: 0 },
        rows: partyTabRows(party),
        fields: 'userEnteredValue,userEnteredFormat.textFormat.bold',
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId: party.sheetId,
          dimension: 'COLUMNS',
          startIndex: PARTY_TAB.firstHiddenColumn,
          endIndex: PARTY_TAB.columns.length,
        },
        properties: { hiddenByUser: true },
        fields: 'hiddenByUser',
      },
    },
    {
      updateDimensionProperties: {
        range: { sheetId: party.sheetId, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
        properties: { pixelSize: 320 },
        fields: 'pixelSize',
      },
    },
    {
      appendCells: {
        sheetId: settingsSheetId,
        rows: [{ values: registryValues(party).map(cell) }],
        fields: 'userEnteredValue',
      },
    },
  ]
}

function registryUpdateRequest(party: Party, settingsSheetId: number): BatchRequest {
  return {
    updateCells: {
      start: { sheetId: settingsSheetId, rowIndex: party.registryRow - 1, columnIndex: 0 },
      rows: [{ values: registryValues(party).map(cell) }],
      fields: 'userEnteredValue',
    },
  }
}

function toRef(meta: SpreadsheetMeta): SpreadsheetRef {
  return { id: meta.spreadsheetId, name: meta.properties.title, url: meta.spreadsheetUrl }
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export class SheetsBackend implements Backend {
  readonly kind = 'google' as const

  listSpreadsheets() {
    return listAppSpreadsheets()
  }

  async createSpreadsheet(title: string): Promise<SpreadsheetRef> {
    const meta = await sheets.createSpreadsheet({
      properties: { title },
      sheets: [
        {
          properties: {
            sheetId: 0,
            title: SETTINGS_TAB,
            index: 0,
            gridProperties: { rowCount: 500, columnCount: REGISTRY.columns.length, frozenRowCount: REGISTRY.headerRow },
          },
          data: [{ startRow: 0, startColumn: 0, rowData: settingsTabRows(DEFAULT_SETTINGS) }],
        },
      ],
    })
    await markAsAppSpreadsheet(meta.spreadsheetId).catch(() => undefined)
    return toRef(meta)
  }

  async initializeSpreadsheet(spreadsheetId: string): Promise<void> {
    const meta = await sheets.getSpreadsheet(spreadsheetId)
    if (!meta.sheets.some((s) => s.properties.title === SETTINGS_TAB)) {
      const sheetId = newSheetId()
      await sheets.batchUpdate(spreadsheetId, [
        {
          addSheet: {
            properties: {
              sheetId,
              title: SETTINGS_TAB,
              index: 0,
              gridProperties: { rowCount: 500, columnCount: REGISTRY.columns.length, frozenRowCount: REGISTRY.headerRow },
            },
          },
        },
        {
          updateCells: {
            start: { sheetId, rowIndex: 0, columnIndex: 0 },
            rows: settingsTabRows(DEFAULT_SETTINGS),
            fields: 'userEnteredValue,userEnteredFormat.textFormat.bold',
          },
        },
      ])
    }
    await markAsAppSpreadsheet(spreadsheetId).catch(() => undefined)
  }

  async loadWorkspace(spreadsheetId: string): Promise<Workspace> {
    const meta = await sheets.getSpreadsheet(spreadsheetId)
    const settingsTab = meta.sheets.find((s) => s.properties.title === SETTINGS_TAB)
    if (!settingsTab) throw new ApiError('notInitialized')

    const otherTabs = meta.sheets.filter((s) => s.properties.sheetId !== settingsTab.properties.sheetId)
    const ranges = [
      rangeOf(SETTINGS_TAB, 'A1'),
      rangeOf(SETTINGS_TAB, `A${REGISTRY.firstRow}:${REGISTRY.lastColumn}`),
      ...otherTabs.map((t) => rangeOf(t.properties.title, 'A1')),
    ]
    const results: sheets.ValueRange[] = []
    for (const part of chunk(ranges, BATCH_GET_CHUNK)) results.push(...(await sheets.batchGetValues(spreadsheetId, part)))

    const settings = parseGlobalSettings(results[0]?.values?.[0]?.[0])
    const registryRows = results[1]?.values ?? []
    const a1BySheetId = new Map<number, unknown>()
    otherTabs.forEach((t, i) => a1BySheetId.set(t.properties.sheetId, results[i + 2]?.values?.[0]?.[0]))

    const seen = new Set<string>()
    const parties: Party[] = []
    registryRows.forEach((row, i) => {
      const reg = rowToRegistry(row, REGISTRY.firstRow + i)
      if (!reg || seen.has(reg.id)) return
      seen.add(reg.id)
      const tab = meta.sheets.find((s) => s.properties.sheetId === reg.sheetId)?.properties
      parties.push(buildParty(reg, tab, a1BySheetId.get(reg.sheetId), settings.paymentMethods[0]))
    })

    return {
      spreadsheetId: meta.spreadsheetId,
      title: meta.properties.title,
      url: meta.spreadsheetUrl,
      settings,
      settingsSheetId: settingsTab.properties.sheetId,
      parties,
      tabCount: meta.sheets.length,
    }
  }

  async loadLedgers(ws: Workspace): Promise<LedgerData> {
    const readable = ws.parties.filter((p) => !p.missing)
    const byParty: LedgerData['byParty'] = {}
    const skippedRows: LedgerData['skippedRows'] = {}
    for (const p of ws.parties) byParty[p.id] = []

    for (const group of chunk(readable, BATCH_GET_CHUNK)) {
      const results = await sheets.batchGetValues(
        ws.spreadsheetId,
        group.map((p) => ledgerRange(p.name)),
      )
      group.forEach((p, i) => {
        const parsed = rowsToEntries(results[i]?.values)
        byParty[p.id] = parsed.entries
        if (parsed.skippedRows.length) skippedRows[p.id] = parsed.skippedRows
      })
    }
    return { byParty, skippedRows }
  }

  async addParty(ws: Workspace, input: PartyInput): Promise<Party> {
    const taken = new Set([ws.settingsSheetId, ...ws.parties.map((p) => p.sheetId)])
    let sheetId = newSheetId()
    while (taken.has(sheetId)) sheetId = newSheetId()

    const party: Party = {
      id: newId('pty'),
      sheetId,
      name: input.name,
      status: 'active',
      createdAt: nowStamp(),
      archivedAt: null,
      phone: input.phone,
      email: input.email,
      defaultMethod: input.defaultMethod || ws.settings.paymentMethods[0],
      notes: input.notes,
      outLabel: input.outLabel,
      inLabel: input.inLabel,
      // Real row is known after the next workspace load.
      registryRow: 0,
    }
    // One atomic batchUpdate: either the tab and its registry row both exist, or neither.
    await sheets.batchUpdate(ws.spreadsheetId, addPartyTabRequests(party, ws.settingsSheetId))
    return party
  }

  async updateParty(ws: Workspace, party: Party, input: PartyInput): Promise<Party> {
    const next: Party = { ...party, ...pickPartyInput(input) }
    const requests: BatchRequest[] = []
    if (input.name !== party.name) {
      requests.push({
        updateSheetProperties: { properties: { sheetId: party.sheetId, title: input.name }, fields: 'title' },
      })
    }
    requests.push({
      updateCells: {
        start: { sheetId: party.sheetId, rowIndex: 0, columnIndex: 0 },
        rows: [{ values: [text(partySettingsJson(next))] }],
        fields: 'userEnteredValue',
      },
    })
    if (party.registryRow > 0) requests.push(registryUpdateRequest(next, ws.settingsSheetId))
    await sheets.batchUpdate(ws.spreadsheetId, requests)
    return next
  }

  async setPartyArchived(ws: Workspace, party: Party, archived: boolean): Promise<Party> {
    const next: Party = {
      ...party,
      status: archived ? 'archived' : 'active',
      archivedAt: archived ? nowStamp() : null,
    }
    const requests: BatchRequest[] = []
    if (!party.missing) {
      requests.push({
        updateSheetProperties: { properties: { sheetId: party.sheetId, hidden: archived }, fields: 'hidden' },
      })
    }
    if (party.registryRow > 0) requests.push(registryUpdateRequest(next, ws.settingsSheetId))
    if (requests.length) await sheets.batchUpdate(ws.spreadsheetId, requests)
    return next
  }

  async addEntry(ws: Workspace, party: Party, input: EntryInput): Promise<Entry> {
    const now = nowStamp()
    const entry: Omit<Entry, 'row'> = { id: newId('ent'), ...input, createdAt: now, updatedAt: now }
    const res = await sheets.appendValues(
      ws.spreadsheetId,
      rangeOf(party.name, `A${PARTY_TAB.headerRow}:${PARTY_TAB.lastColumn}${PARTY_TAB.headerRow}`),
      [entryToRow(entry)],
    )
    return { ...entry, row: parseUpdatedRow(res.updates.updatedRange) }
  }

  async updateEntry(ws: Workspace, party: Party, entry: Entry, input: EntryInput): Promise<Entry> {
    const range = entryRowRange(party.name, entry.row)
    // Re-read the row first: rows can move if someone sorts or deletes rows in the sheet.
    const current = await sheets.getValues(ws.spreadsheetId, range)
    const onSheet = rowToEntry(current.values?.[0], entry.row)
    const sameRow = isSyntheticId(entry.id)
      ? !!onSheet && onSheet.date === entry.date && onSheet.type === entry.type && onSheet.amount === entry.amount
      : !!onSheet && onSheet.id === entry.id
    if (!sameRow || (entry.updatedAt && onSheet?.updatedAt !== entry.updatedAt)) {
      throw new ApiError('conflict')
    }

    const now = nowStamp()
    const next: Entry = {
      ...entry,
      ...input,
      id: isSyntheticId(entry.id) ? newId('ent') : entry.id,
      createdAt: entry.createdAt || now,
      updatedAt: now,
    }
    await sheets.updateValues(ws.spreadsheetId, range, [entryToRow(next)])
    return next
  }

  async saveSettings(ws: Workspace, settings: GlobalSettings): Promise<GlobalSettings> {
    await sheets.updateValues(ws.spreadsheetId, rangeOf(SETTINGS_TAB, 'A1'), [[globalSettingsJson(settings)]])
    return settings
  }
}
