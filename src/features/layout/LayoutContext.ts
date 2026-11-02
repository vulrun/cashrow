import { createContext, useContext } from 'react'
import type { Party } from '@/domain/types'

export interface LayoutActions {
  openAddParty: () => void
  openParties: () => void
  openGlobalSettings: () => void
  requestArchive: (party: Party) => void
}

export const LayoutContext = createContext<LayoutActions | null>(null)

export function useLayout(): LayoutActions {
  const ctx = useContext(LayoutContext)
  if (!ctx) throw new Error('useLayout must be used inside <AppLayout>')
  return ctx
}
