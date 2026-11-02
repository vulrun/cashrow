import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AlertTriangleIcon, ArrowDownLeftIcon, ArrowUpRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DEMO_SPREADSHEET_ID } from '@/backend'
import { balanceDirection, computeTotals, entryLabels, runningBalances } from '@/domain/ledger'
import type { Entry } from '@/domain/types'
import { useCashbook, useFormatters } from '@/features/cashbook/useCashbook'
import { PageHeader } from '@/features/layout/PageHeader'
import { useLayout } from '@/features/layout/LayoutContext'
import { InsightsCard } from '@/features/overview/InsightsCard'
import { useToday } from '@/hooks/useToday'
import { pluralize } from '@/lib/utils'
import { useSetPartyArchivedMutation, type AppError } from '@/store/api'
import { EntrySheet, type PanelState } from './EntrySheet'
import { LedgerCard } from './LedgerCard'
import { PartySettingsDialog } from './PartySettingsDialog'

export function PartyPage() {
  const { partyId = '' } = useParams()
  // Fresh state (filters, open panel) for each party.
  return <PartyView key={partyId} partyId={partyId} />
}

function PartyView({ partyId }: { partyId: string }) {
  const cb = useCashbook()
  const { ws, settings, ledgers, ledgersQuery } = cb
  const fmt = useFormatters(settings)
  const today = useToday()
  const { requestArchive } = useLayout()
  const [searchParams] = useSearchParams()
  const [panel, setPanel] = useState<PanelState | null>(() =>
    // ?entry=<id> opens that entry; ?calendar=1 also opens its calendar (screenshots/tests).
    searchParams.get('entry') ? { mode: 'edit', entryId: searchParams.get('entry')! } : null,
  )
  const [status, setStatus] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [nonce, setNonce] = useState(0)
  const [setArchived, archiveState] = useSetPartyArchivedMutation()

  const party = ws?.parties.find((p) => p.id === partyId)
  const entries = useMemo(() => (party ? (ledgers?.byParty[party.id] ?? []) : []), [ledgers, party])
  const totals = useMemo(() => computeTotals(entries), [entries])
  const balances = useMemo(() => runningBalances(entries), [entries])
  const skipped = party ? (ledgers?.skippedRows[party.id] ?? []) : []
  const isDemo = ws?.spreadsheetId === DEMO_SPREADSHEET_ID
  const loadingLedger = ledgersQuery.isLoading && !ledgers

  if (!ws || (!party && cb.workspaceQuery.isFetching)) return <PartySkeleton />
  if (!party) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <h1 className="text-lg font-bold">Party not found</h1>
          <p className="mt-1.5 text-subtle-foreground">It may have been removed from the spreadsheet.</p>
          <Button variant="secondary" className="mt-4" asChild>
            <Link to="/">Back to overview</Link>
          </Button>
        </div>
      </div>
    )
  }

  const archived = party.status === 'archived'
  const dir = balanceDirection(totals.balance)
  const labels = entryLabels(party)

  function openNew(type: 'IN' | 'OUT') {
    setStatus('')
    setNonce((n) => n + 1)
    setPanel({ mode: 'new', type, nonce: nonce + 1 })
  }

  function onSaved(entry: Entry, { andNew, draft }: { andNew: boolean; draft: { type: 'IN' | 'OUT'; date: string; method: string } }) {
    if (andNew) {
      setNonce((n) => n + 1)
      setPanel({ mode: 'new', type: draft.type, carry: { date: draft.date, method: draft.method }, nonce: nonce + 1 })
      setStatus(`Saved to row ${entry.row}. Add the next one.`)
    } else {
      setPanel({ mode: 'edit', entryId: entry.id })
      setStatus(isDemo ? `Saved · row ${entry.row}` : `Saved to Google Sheets · row ${entry.row}`)
    }
  }

  async function restore() {
    if (!ws || !party) return
    const res = await setArchived({ spreadsheetId: ws.spreadsheetId, partyId: party.id, archived: false })
    if ('error' in res) toast.error((res.error as AppError).message)
    else toast.success(`${party.name} restored`)
  }

  return (
    <>
      <PageHeader
        icon={party.name.trim().charAt(0).toUpperCase() || '?'}
        title={party.name}
        badge={
          archived && (
            <span className="eyebrow inline-flex h-[22px] items-center rounded-md bg-muted px-2 text-label">
              Archived
            </span>
          )
        }
        subtitle={isDemo ? 'Ledger · demo data' : `Ledger · tab “${party.name}” in ${ws.title}`}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-5 sm:py-7">
        <div className="mx-auto flex max-w-[960px] flex-col gap-5">
          {archived && (
            <div
              role="status"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border bg-brand-soft px-4 py-3 text-[13.5px] text-brand-strong"
            >
              <span>
                This party is archived.{' '}
                {isDemo ? 'All entries are kept.' : 'Its tab is hidden in Google Sheets; all entries are kept.'}
              </span>
              <Button variant="outline" size="sm" onClick={restore} disabled={archiveState.isLoading}>
                Restore
              </Button>
            </div>
          )}

          {party.missing && (
            <div role="alert" className="flex gap-2.5 rounded-xl border border-expense-border bg-expense-soft px-4 py-3 text-[13.5px] text-expense">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              The tab for this party was deleted or renamed outside the app, so its entries can't be loaded.
            </div>
          )}

          {skipped.length > 0 && (
            <div role="status" className="flex gap-2.5 rounded-xl border border-highlight-border bg-highlight-soft px-4 py-3 text-[13.5px] text-highlight-ink">
              <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {pluralize(skipped.length, 'row')} in this tab couldn't be read (row {skipped.slice(0, 5).join(', ')}
                {skipped.length > 5 ? '…' : ''}). Check the date, type (IN or OUT) and amount in Google Sheets.
              </span>
            </div>
          )}

          <InsightsCard
            loading={loadingLedger}
            cells={[
              { label: labels.in, value: fmt.money(totals.totalIn), tone: 'income', note: pluralize(totals.inCount, 'entry', 'entries'), valueClassName: "opacity-80 font-medium" },
              { label: labels.out, value: fmt.money(totals.totalOut), tone: 'expense', note: pluralize(totals.outCount, 'entry', 'entries'), valueClassName: "opacity-80 font-medium" },
              {
                label: `Balance · ${fmt.caption(totals.balance)}`,
                value: fmt.money(Math.abs(totals.balance)),
                tone: 'neutral',
                valueClassName: dir === 'in' ? 'text-income' : dir === 'out' ? 'text-expense' : 'text-muted-foreground',
                note: totals.lastDate ? `Last entry ${fmt.date(totals.lastDate)}` : 'No entries yet',
              },
            ]}
          />

          <LedgerCard
            entries={entries}
            balances={balances}
            settings={settings}
            labels={labels}
            today={today}
            loading={loadingLedger}
            selectedId={panel?.mode === 'edit' ? panel.entryId : null}
            onEdit={(e) => {
              setStatus('')
              setPanel({ mode: 'edit', entryId: e.id })
            }}
            fmt={fmt}
          />
        </div>
      </div>

      {!archived && !party.missing && (
        <div className="sticky bottom-0 z-10 flex justify-center gap-3.5 border-t border-border bg-card px-4 py-4">
          <Button variant="expense" size="lg" className="font-bold" onClick={() => openNew('OUT')}>
            <ArrowUpRightIcon strokeWidth={2.4} />
            {labels.outAction}
          </Button>
          <Button variant="income" size="lg" className="font-bold" onClick={() => openNew('IN')}>
            <ArrowDownLeftIcon strokeWidth={2.4} />
            {labels.inAction}
          </Button>
        </div>
      )}

      <EntrySheet
        panel={panel}
        onClose={() => {
          setPanel(null)
          setStatus('')
        }}
        onSaved={onSaved}
        status={status}
        onStatusClear={() => setStatus('')}
        party={party}
        workspace={ws}
        entries={entries}
        balances={balances}
        today={today}
        defaultCalendarOpen={searchParams.get('calendar') === '1'}
      />

      <PartySettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        party={party}
        workspace={ws}
        entryCount={entries.length}
        onArchive={() => {
          setSettingsOpen(false)
          requestArchive(party)
        }}
      />
    </>
  )
}

function PartySkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading ledger">
      <div className="flex items-center gap-3.5 border-b border-border bg-card px-5 py-5">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-60" />
        </div>
      </div>
      <div className="mx-auto mt-7 max-w-[960px] space-y-5 px-5">
        <Skeleton className="h-[104px] w-full rounded-[14px]" />
        <Skeleton className="h-96 w-full rounded-[14px]" />
      </div>
    </div>
  )
}
