import type { SpreadsheetRef } from '@/domain/types'
import { googleRequest } from './http'

/**
 * Drive API v3 calls. With the drive.file scope the app can only see files it
 * created itself, which is exactly the set of spreadsheets we care about.
 */

const BASE = 'https://www.googleapis.com/drive/v3/files'
const SHEET_MIME = 'application/vnd.google-apps.spreadsheet'

/** Marker stored on spreadsheets created by this app. */
export const APP_PROPERTY = { key: 'cashrow', value: '1' } as const

interface DriveFile {
  id: string
  name: string
  modifiedTime?: string
  webViewLink?: string
}

export async function listAppSpreadsheets(): Promise<SpreadsheetRef[]> {
  const q = [
    `mimeType='${SHEET_MIME}'`,
    'trashed=false',
    `appProperties has { key='${APP_PROPERTY.key}' and value='${APP_PROPERTY.value}' }`,
  ].join(' and ')
  const res = await googleRequest<{ files?: DriveFile[] }>(BASE, {
    query: {
      q,
      fields: 'files(id,name,modifiedTime,webViewLink)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
      spaces: 'drive',
    },
  })
  return (res.files ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    modifiedTime: f.modifiedTime,
    url: f.webViewLink ?? `https://docs.google.com/spreadsheets/d/${f.id}/edit`,
  }))
}

/** Tags a spreadsheet so it shows up in listAppSpreadsheets(). */
export function markAsAppSpreadsheet(fileId: string) {
  return googleRequest<DriveFile>(`${BASE}/${encodeURIComponent(fileId)}`, {
    method: 'PATCH',
    query: { fields: 'id' },
    body: { appProperties: { [APP_PROPERTY.key]: APP_PROPERTY.value } },
  })
}
