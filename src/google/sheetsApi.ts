import { googleRequest } from './http'

/** Thin typed wrappers over the Google Sheets API v4 REST endpoints we use. */

const BASE = 'https://sheets.googleapis.com/v4/spreadsheets'

export type CellValue = string | number | boolean | null

export interface SheetProperties {
  sheetId: number
  title: string
  index?: number
  hidden?: boolean
}

export interface SpreadsheetMeta {
  spreadsheetId: string
  spreadsheetUrl: string
  properties: { title: string }
  sheets: { properties: SheetProperties }[]
}

export interface ValueRange {
  range: string
  majorDimension?: 'ROWS' | 'COLUMNS'
  values?: CellValue[][]
}

export interface AppendResponse {
  spreadsheetId: string
  tableRange?: string
  updates: { updatedRange: string; updatedRows: number }
}

/** Any request object from spreadsheets.batchUpdate. Kept loose on purpose. */
export type BatchRequest = Record<string, unknown>

export interface BatchUpdateResponse {
  spreadsheetId: string
  replies?: Record<string, unknown>[]
}

export function getSpreadsheet(spreadsheetId: string) {
  return googleRequest<SpreadsheetMeta>(`${BASE}/${encodeURIComponent(spreadsheetId)}`, {
    query: {
      fields: 'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index,hidden)',
    },
  })
}

export function createSpreadsheet(body: Record<string, unknown>) {
  return googleRequest<SpreadsheetMeta>(BASE, {
    method: 'POST',
    body,
    query: { fields: 'spreadsheetId,spreadsheetUrl,properties.title,sheets.properties(sheetId,title,index,hidden)' },
  })
}

export function batchUpdate(spreadsheetId: string, requests: BatchRequest[]) {
  return googleRequest<BatchUpdateResponse>(`${BASE}/${encodeURIComponent(spreadsheetId)}:batchUpdate`, {
    method: 'POST',
    body: { requests },
  })
}

export async function batchGetValues(spreadsheetId: string, ranges: string[]): Promise<ValueRange[]> {
  if (ranges.length === 0) return []
  const res = await googleRequest<{ valueRanges?: ValueRange[] }>(
    `${BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet`,
    { query: { ranges, valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' } },
  )
  return res.valueRanges ?? []
}

export function getValues(spreadsheetId: string, range: string) {
  return googleRequest<ValueRange>(
    `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { query: { valueRenderOption: 'UNFORMATTED_VALUE', dateTimeRenderOption: 'FORMATTED_STRING' } },
  )
}

/** Writes values exactly as given (RAW): text that starts with "=" stays text. */
export function updateValues(spreadsheetId: string, range: string, values: CellValue[][]) {
  return googleRequest<{ updatedRange: string }>(
    `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}`,
    { method: 'PUT', query: { valueInputOption: 'RAW' }, body: { range, majorDimension: 'ROWS', values } },
  )
}

export function appendValues(spreadsheetId: string, range: string, values: CellValue[][]) {
  return googleRequest<AppendResponse>(
    `${BASE}/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append`,
    {
      method: 'POST',
      query: { valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS', includeValuesInResponse: false },
      body: { range, majorDimension: 'ROWS', values },
    },
  )
}
