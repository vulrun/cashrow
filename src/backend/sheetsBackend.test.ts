import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry, Party, Workspace } from '@/domain/types'
import { ApiError } from '@/google/errors'

vi.mock('@/google/sheetsApi', () => ({
  getSpreadsheet: vi.fn(),
  createSpreadsheet: vi.fn(),
  batchUpdate: vi.fn(),
  batchGetValues: vi.fn(),
  getValues: vi.fn(),
  updateValues: vi.fn(),
  appendValues: vi.fn(),
}))
vi.mock('@/google/driveApi', () => ({
  listAppSpreadsheets: vi.fn(),
  markAsAppSpreadsheet: vi.fn().mockResolvedValue({}),
}))

const sheets = await import('@/google/sheetsApi')
const { SheetsBackend } = await import('./sheetsBackend')
const api = vi.mocked(sheets)
const backend = new SheetsBackend()

const meta = {
  spreadsheetId: 'sheet1',
  spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet1/edit',
  properties: { title: 'Cashrow 2026' },
  sheets: [
    { properties: { sheetId: 0, title: '__Settings' } },
    { properties: { sheetId: 111, title: 'Sharma Traders' } },
    { properties: { sheetId: 222, title: 'My own notes' } },
  ],
}

const party: Party = {
  id: 'pty_1',
  sheetId: 111,
  name: 'Sharma Traders',
  status: 'active',
  createdAt: '2026-05-28T09:00:00.000Z',
  archivedAt: null,
  phone: '',
  email: '',
  defaultMethod: 'UPI',
  notes: '',
  outLabel: '',
  inLabel: '',
  registryRow: 4,
}

const ws: Workspace = {
  spreadsheetId: 'sheet1',
  title: 'Cashrow 2026',
  url: meta.spreadsheetUrl,
  settings: {
    schemaVersion: 1,
    currency: 'INR',
    dateFormat: 'text',
    paymentMethods: ['UPI', 'Cash'],
    allowFutureDates: false,
    balanceWording: 'net',
    sidebarTotals: 'balances',
    partySort: 'lastEntry',
    partySortDir: 'desc',
    ledgerSortDir: 'desc',
    ledgerPageSize: 25,
  },
  settingsSheetId: 0,
  parties: [party],
  tabCount: 3,
}

const entry: Entry = {
  id: 'ent_1',
  date: '2026-10-18',
  type: 'IN',
  amount: 8000,
  method: 'Cash',
  notes: 'Part payment',
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
  row: 28,
}
const entryRow = ['2026-10-18', 'IN', 8000, 'Cash', 'Part payment', 'ent_1', entry.createdAt, entry.updatedAt]

beforeEach(() => vi.clearAllMocks())

describe('SheetsBackend.loadWorkspace', () => {
  it('reads settings, the registry and each party tab in two requests', async () => {
    api.getSpreadsheet.mockResolvedValue(meta)
    api.batchGetValues.mockResolvedValue([
      { range: '', values: [['{"currency":"USD","paymentMethods":["UPI"]}']] },
      { range: '', values: [['pty_1', 111, 'Sharma Traders', 'active', party.createdAt, '']] },
      { range: '', values: [['{"phone":"+91 98300 41275","defaultPaymentMethod":"Cash"}']] },
      { range: '', values: [] },
    ])

    const result = await backend.loadWorkspace('sheet1')

    expect(api.batchGetValues).toHaveBeenCalledWith('sheet1', [
      "'__Settings'!A1",
      "'__Settings'!A4:F",
      "'Sharma Traders'!A1",
      "'My own notes'!A1",
    ])
    expect(result.settings.currency).toBe('USD')
    expect(result.tabCount).toBe(3)
    expect(result.parties).toHaveLength(1)
    expect(result.parties[0]).toMatchObject({ id: 'pty_1', phone: '+91 98300 41275', defaultMethod: 'Cash', missing: false })
  })

  it('reports a spreadsheet without __Settings as not initialized', async () => {
    api.getSpreadsheet.mockResolvedValue({ ...meta, sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }] })
    await expect(backend.loadWorkspace('sheet1')).rejects.toMatchObject({ kind: 'notInitialized' })
  })
})

describe('SheetsBackend.loadLedgers', () => {
  it('reads every party tab from row 6 and reports unreadable rows', async () => {
    api.batchGetValues.mockResolvedValue([{ range: '', values: [entryRow, ['junk', 'x']] }])
    const data = await backend.loadLedgers(ws)
    expect(api.batchGetValues).toHaveBeenCalledWith('sheet1', ["'Sharma Traders'!A6:H"])
    expect(data.byParty.pty_1).toHaveLength(1)
    expect(data.byParty.pty_1[0].row).toBe(6)
    expect(data.skippedRows.pty_1).toEqual([7])
  })
})

describe('SheetsBackend.addParty', () => {
  it('creates the tab and its registry row in one atomic batchUpdate', async () => {
    api.batchUpdate.mockResolvedValue({ spreadsheetId: 'sheet1' })
    const created = await backend.addParty(ws, {
      name: 'Nair Stationers',
      phone: '',
      email: '',
      defaultMethod: 'UPI',
      notes: '',
      outLabel: '',
      inLabel: '',
    })

    expect(api.batchUpdate).toHaveBeenCalledTimes(1)
    const requests = api.batchUpdate.mock.calls[0][1] as Record<string, any>[]
    expect(requests[0].addSheet.properties).toMatchObject({ title: 'Nair Stationers', sheetId: created.sheetId })
    expect(requests[0].addSheet.properties.gridProperties.frozenRowCount).toBe(5)
    // Header row (row 5) has the entry columns.
    const header = requests[1].updateCells.rows[4].values.map((c: any) => c.userEnteredValue.stringValue)
    expect(header).toEqual(['Date', 'Type', 'Amount', 'Payment Method', 'Notes', 'ID', 'Created At', 'Updated At'])
    // Technical columns F:H are hidden.
    expect(requests[2].updateDimensionProperties.range).toMatchObject({ startIndex: 5, endIndex: 8 })
    // Registry row appended to __Settings.
    const reg = requests.at(-1)!.appendCells
    expect(reg.sheetId).toBe(0)
    expect(reg.rows[0].values[0].userEnteredValue.stringValue).toBe(created.id)
    expect(created.sheetId).not.toBe(111)
  })
})

describe('SheetsBackend entries', () => {
  it('appends with RAW values and returns the sheet row', async () => {
    api.appendValues.mockResolvedValue({ spreadsheetId: 'sheet1', updates: { updatedRange: "'Sharma Traders'!A31:H31", updatedRows: 1 } })
    const created = await backend.addEntry(ws, party, {
      date: '2026-11-02',
      type: 'OUT',
      amount: 1250,
      method: 'UPI',
      notes: '=HYPERLINK("x")',
    })
    const [, range, values] = api.appendValues.mock.calls[0]
    expect(range).toBe("'Sharma Traders'!A5:H5")
    expect(values[0].slice(0, 5)).toEqual(['2026-11-02', 'OUT', 1250, 'UPI', '=HYPERLINK("x")'])
    expect(created.row).toBe(31)
    expect(created.id).toMatch(/^ent_/)
  })

  it('updates the same row after checking it still holds this entry', async () => {
    api.getValues.mockResolvedValue({ range: '', values: [entryRow] })
    api.updateValues.mockResolvedValue({ updatedRange: '' })
    const updated = await backend.updateEntry(ws, party, entry, { ...entry, amount: 9000 })
    expect(api.getValues).toHaveBeenCalledWith('sheet1', "'Sharma Traders'!A28:H28")
    const [, range, values] = api.updateValues.mock.calls[0]
    expect(range).toBe("'Sharma Traders'!A28:H28")
    expect(values[0][2]).toBe(9000)
    expect(values[0][5]).toBe('ent_1')
    expect(updated.updatedAt).not.toBe(entry.updatedAt)
  })

  it('refuses to overwrite a row that moved or changed', async () => {
    api.getValues.mockResolvedValue({ range: '', values: [['2026-10-18', 'IN', 8000, 'Cash', '', 'ent_other', '', '']] })
    await expect(backend.updateEntry(ws, party, entry, entry)).rejects.toBeInstanceOf(ApiError)
    expect(api.updateValues).not.toHaveBeenCalled()

    api.getValues.mockResolvedValue({ range: '', values: [[...entryRow.slice(0, 7), '2026-11-01T00:00:00Z']] })
    await expect(backend.updateEntry(ws, party, entry, entry)).rejects.toMatchObject({ kind: 'conflict' })
  })

  it('gives hand-typed rows a real id on first edit', async () => {
    const typed: Entry = { ...entry, id: 'row-40', row: 40, createdAt: '', updatedAt: '' }
    api.getValues.mockResolvedValue({ range: '', values: [['2026-10-18', 'IN', 8000, 'Cash', 'typed']] })
    api.updateValues.mockResolvedValue({ updatedRange: '' })
    const updated = await backend.updateEntry(ws, party, typed, { ...typed })
    expect(updated.id).toMatch(/^ent_/)
  })
})

describe('SheetsBackend archive and settings', () => {
  it('hides the tab and marks the registry row', async () => {
    api.batchUpdate.mockResolvedValue({ spreadsheetId: 'sheet1' })
    const archived = await backend.setPartyArchived(ws, party, true)
    const requests = api.batchUpdate.mock.calls[0][1] as Record<string, any>[]
    expect(requests[0].updateSheetProperties).toEqual({ properties: { sheetId: 111, hidden: true }, fields: 'hidden' })
    expect(requests[1].updateCells.start).toEqual({ sheetId: 0, rowIndex: 3, columnIndex: 0 })
    expect(requests[1].updateCells.rows[0].values[3].userEnteredValue.stringValue).toBe('archived')
    expect(archived.status).toBe('archived')
  })

  it('renames the tab when the party name changes', async () => {
    api.batchUpdate.mockResolvedValue({ spreadsheetId: 'sheet1' })
    await backend.updateParty(ws, party, { name: 'Sharma Traders Pvt', phone: '', email: '', defaultMethod: 'UPI', notes: '', outLabel: '', inLabel: '' })
    const requests = api.batchUpdate.mock.calls[0][1] as Record<string, any>[]
    expect(requests[0].updateSheetProperties).toEqual({ properties: { sheetId: 111, title: 'Sharma Traders Pvt' }, fields: 'title' })
  })

  it('stores entry labels in the party tab A1 JSON', async () => {
    api.batchUpdate.mockResolvedValue({ spreadsheetId: 'sheet1' })
    await backend.updateParty(ws, party, { ...party, outLabel: 'You paid', inLabel: 'You owe' })
    const requests = api.batchUpdate.mock.calls[0][1] as Record<string, any>[]
    const a1 = requests[0].updateCells
    expect(a1.start).toEqual({ sheetId: 111, rowIndex: 0, columnIndex: 0 })
    expect(JSON.parse(a1.rows[0].values[0].userEnteredValue.stringValue)).toMatchObject({ outLabel: 'You paid', inLabel: 'You owe' })
  })

  it('writes global settings as JSON to __Settings!A1', async () => {
    api.updateValues.mockResolvedValue({ updatedRange: '' })
    await backend.saveSettings(ws, { ...ws.settings, currency: 'EUR' })
    const [, range, values] = api.updateValues.mock.calls[0]
    expect(range).toBe("'__Settings'!A1")
    expect(JSON.parse(values[0][0] as string)).toMatchObject({ currency: 'EUR', schemaVersion: 1 })
  })
})
