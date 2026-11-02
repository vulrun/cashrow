import { useMemo } from 'react'
import { balanceCaption, byRecentActivity, computeTotals, sumBalances, sumTotals } from '@/domain/ledger'
import { DEFAULT_SETTINGS } from '@/domain/schemas'
import type { Entry, GlobalSettings, Party, PartyTotals } from '@/domain/types'
import { formatDate, formatDayMonth } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import { useAppSelector } from '@/store'
import { useGetLedgersQuery, useGetWorkspaceQuery, type AppError } from '@/store/api'

export interface PartySummary {
  party: Party
  totals: PartyTotals
}

/** Workspace + ledgers for the selected spreadsheet, with derived totals. */
export function useCashbook() {
  const spreadsheetId = useAppSelector((s) => s.workspace.spreadsheetId) ?? ''
  const ready = useAppSelector((s) => s.auth.status === 'active')
  const mode = useAppSelector((s) => s.auth.mode)

  const workspaceQuery = useGetWorkspaceQuery(spreadsheetId, { skip: !ready || !spreadsheetId })
  const ledgersQuery = useGetLedgersQuery(spreadsheetId, { skip: !ready || !workspaceQuery.data })

  const ws = workspaceQuery.data
  const ledgers = ledgersQuery.data

  const summaries = useMemo<PartySummary[]>(() => {
    if (!ws) return []
    return ws.parties
      .map((party) => ({ party, totals: computeTotals(ledgers?.byParty[party.id] ?? []) }))
      .sort(byRecentActivity)
  }, [ws, ledgers])

  const active = useMemo(() => summaries.filter((s) => s.party.status === 'active'), [summaries])
  const archived = useMemo(() => summaries.filter((s) => s.party.status === 'archived'), [summaries])
  const overall = useMemo(() => sumTotals(active.map((s) => s.totals)), [active])
  const outstanding = useMemo(() => sumBalances(active.map((s) => s.totals)), [active])

  return {
    spreadsheetId,
    mode,
    ready,
    ws,
    ledgers,
    settings: ws?.settings ?? DEFAULT_SETTINGS,
    summaries,
    active,
    archived,
    overall,
    outstanding,
    workspaceQuery,
    ledgersQuery,
    error: (workspaceQuery.error ?? ledgersQuery.error) as AppError | undefined,
    entriesFor: (partyId: string): Entry[] => ledgers?.byParty[partyId] ?? [],
  }
}

/** Money, date and balance-caption formatters bound to the spreadsheet's settings. */
export function useFormatters(settings: GlobalSettings) {
  return useMemo(
    () => ({
      money: (n: number, opts?: { signed?: boolean }) => formatMoney(n, settings.currency, opts),
      date: (iso: string | null | undefined) => formatDate(iso, settings.dateFormat),
      dayMonth: (iso: string | null | undefined) => formatDayMonth(iso, settings.dateFormat),
      caption: (balance: number, opts?: { short?: boolean }) => balanceCaption(balance, settings.balanceWording, opts),
    }),
    [settings.currency, settings.dateFormat, settings.balanceWording],
  )
}
