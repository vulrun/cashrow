import { useCallback } from 'react'
import { toast } from 'sonner'
import type { GlobalSettings, Workspace } from '@/domain/types'
import { useSaveSettingsMutation, type AppError } from '@/store/api'

/** Saves part of the global settings straight away (sort order, page size), for controls without a Save button. */
export function useUpdateSettings(ws: Workspace | undefined) {
  const [save] = useSaveSettingsMutation()
  return useCallback(
    async (patch: Partial<GlobalSettings>) => {
      if (!ws) return
      const res = await save({ spreadsheetId: ws.spreadsheetId, settings: { ...ws.settings, ...patch } })
      if ('error' in res) toast.error((res.error as AppError).message)
    },
    [ws, save],
  )
}
