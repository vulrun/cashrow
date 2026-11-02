import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ArchiveIcon, PlusIcon, RefreshCwIcon } from 'lucide-react'
import { CashrowMark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { Skeleton } from '@/components/ui/skeleton'
import { balanceDirection } from '@/domain/ledger'
import { useCashbook, useFormatters, type PartySummary } from '@/features/cashbook/useCashbook'
import { PageHeader } from '@/features/layout/PageHeader'
import { useLayout } from '@/features/layout/LayoutContext'
import { useRelativeTime } from '@/hooks/useRelativeTime'
import { cn, pluralize } from '@/lib/utils'
import { useSetPartyArchivedMutation, type AppError } from '@/store/api'
import { InsightsCard } from './InsightsCard'

const AMOUNT_COLOR = { in: 'text-income', out: 'text-expense', settled: 'text-muted-foreground' } as const
// Compact (party, balance, actions) below xl; full columns from xl up.
const GRID =
  'grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 sm:px-[22px] xl:grid-cols-[minmax(180px,2fr)_120px_110px_110px_120px_48px]'
const WIDE = 'hidden xl:block'

export function OverviewPage() {
  const { ws, active, archived, overall, settings, workspaceQuery, ledgersQuery, mode } = useCashbook()
  const fmt = useFormatters(settings)
  const { openGlobalSettings, openAddParty, requestArchive } = useLayout()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'archived' ? 'archived' : 'active'
  const synced = useRelativeTime(ledgersQuery.fulfilledTimeStamp)
  const [setArchived] = useSetPartyArchivedMutation()

  const loading = !ws || (ledgersQuery.isLoading && !ledgersQuery.data)
  const overallDir = balanceDirection(overall.balance)
  const list = view === 'active' ? active : archived
  const isDemo = mode === 'demo'

  const refresh = () => {
    void workspaceQuery.refetch()
    void ledgersQuery.refetch()
  }

  async function restore(s: PartySummary) {
    if (!ws) return
    const res = await setArchived({ spreadsheetId: ws.spreadsheetId, partyId: s.party.id, archived: false })
    if ('error' in res) toast.error((res.error as AppError).message)
    else toast.success(isDemo ? `${s.party.name} restored` : `${s.party.name} restored. Its tab is visible again.`)
  }

  return (
    <>
      <PageHeader
        icon={<CashrowMark tone="onBrand" className="h-[23px] translate-x-[5%]" />}
        title="Overview"
        subtitle={
          ws ? (
            <>
              {ws.title} · {isDemo ? 'Demo data' : 'Google Sheet'}
              {synced && ` · synced ${synced}`}
            </>
          ) : (
            'Loading…'
          )
        }
        actions={
          <>
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Reload from Google Sheets"
              title="Reload"
              onClick={refresh}
              disabled={ledgersQuery.isFetching}
            >
              <RefreshCwIcon className={cn('size-4', ledgersQuery.isFetching && 'animate-spin')} />
            </Button>
            {ws?.url && (
              <Button variant="secondary" size="sm" asChild>
                <a href={ws.url} target="_blank" rel="noreferrer">
                  Open sheet
                </a>
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={openGlobalSettings} disabled={!ws}>
              Settings
            </Button>
          </>
        }
      />

      <div className="flex-1 px-4 py-6 sm:px-5 sm:py-7">
        <div className="mx-auto flex max-w-[960px] flex-col gap-5">
          <InsightsCard
            loading={loading}
            cells={[
               {
                label: "You got",
                value: fmt.money(overall.totalIn),
                tone: "income",
                note: "Cash in, all active parties",
                valueClassName: `opacity-80 font-medium`,
              },
              {
                label: "You gave",
                value: fmt.money(overall.totalOut),
                tone: "expense",
                note: "Cash out, all active parties",
                valueClassName: `opacity-80 font-medium`,
              },
              {
                label: `Net balance · ${fmt.caption(overall.balance)}`,
                value: fmt.money(Math.abs(overall.balance)),
                tone: "neutral",
                valueClassName: AMOUNT_COLOR[overallDir],
                note: `${pluralize(active.length, "party", "parties")} · ${pluralize(overall.count, "entry", "entries")}`,
              },
            ]}
          />

          <section aria-labelledby="parties-heading" className="rounded-[14px] border border-border bg-card shadow-[0_1px_2px_rgba(14,23,38,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-[22px] py-3.5">
              <h2 id="parties-heading" className="text-[15px] font-bold">
                Parties
              </h2>
              <Segmented
                aria-label="Show parties"
                value={view}
                onValueChange={(v) => setParams(v === 'archived' ? { view: 'archived' } : {})}
                options={[
                  { value: 'active', label: `Active ${active.length}` },
                  { value: 'archived', label: `Archived ${archived.length}` },
                ]}
              />
            </div>

            <div className="overflow-x-auto">
              <div role="table" aria-labelledby="parties-heading" className="xl:min-w-[720px]">
                <div
                  role="row"
                  className={cn(GRID, 'eyebrow min-h-[42px] border-b border-hairline text-muted-foreground')}
                >
                  <div role="columnheader">Party</div>
                  <div role="columnheader" className={WIDE}>
                    {view === 'active' ? 'Last entry' : 'Archived on'}
                  </div>
                  <div role="columnheader" className={cn(WIDE, 'text-right')}>You gave</div>
                  <div role="columnheader" className={cn(WIDE, 'text-right')}>You got</div>
                  <div role="columnheader" className="text-right">Balance</div>
                  <div role="columnheader">
                    <span className="sr-only">Actions</span>
                  </div>
                </div>

                {loading &&
                  Array.from({ length: 5 }, (_, i) => (
                    <div key={i} role="row" className={cn(GRID, 'min-h-14 border-b border-hairline')}>
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className={cn(WIDE, 'h-4 w-20')} />
                      <Skeleton className={cn(WIDE, 'ml-auto h-4 w-16')} />
                      <Skeleton className={cn(WIDE, 'ml-auto h-4 w-16')} />
                      <Skeleton className="ml-auto h-4 w-20" />
                      <span />
                    </div>
                  ))}

                {!loading &&
                  list.map((s) => {
                    const dir = balanceDirection(s.totals.balance)
                    return (
                      <div key={s.party.id} role="row" className={cn(GRID, 'min-h-14 border-b border-hairline')}>
                        <div role="cell" className="min-w-0">
                          <Link
                            to={`/parties/${s.party.id}`}
                            className="block truncate font-semibold text-label outline-none hover:text-brand-strong focus-visible:underline"
                          >
                            {s.party.name}
                          </Link>
                          {s.party.missing && (
                            <span className="text-xs text-expense">Tab missing in Google Sheets</span>
                          )}
                        </div>
                        <div role="cell" className={cn(WIDE, 'tabular text-subtle-foreground')}>
                          {view === 'active'
                            ? s.totals.lastDate
                              ? fmt.date(s.totals.lastDate)
                              : '—'
                            : fmt.date(s.party.archivedAt?.slice(0, 10))}
                        </div>
                        <div role="cell" className={cn(WIDE, 'tabular text-right opacity-80 font-medium text-expense')}>
                          {fmt.money(s.totals.totalOut)}
                        </div>
                        <div role="cell" className={cn(WIDE, 'tabular text-right opacity-80 font-medium text-income')}>
                          {fmt.money(s.totals.totalIn)}
                        </div>
                        <div role="cell" className="flex flex-col items-end">
                          <span className={cn('tabular font-bold', AMOUNT_COLOR[dir])}>
                            {fmt.money(Math.abs(s.totals.balance))}
                          </span>
                          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                            {fmt.caption(s.totals.balance)}
                          </span>
                        </div>
                        <div role="cell" className="flex justify-end gap-0.5">
                          {view === 'active' ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Archive ${s.party.name}`}
                              title="Archive"
                              onClick={() => requestArchive(s.party)}
                            >
                              <ArchiveIcon />
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => restore(s)}>
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}

                {!loading && list.length === 0 && (
                  <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                    <p className="text-muted-foreground">
                      {view === 'active' ? 'No parties yet. Add one to start its ledger.' : 'No archived parties.'}
                    </p>
                    {view === 'active' && (
                      <Button variant="soft" onClick={openAddParty}>
                        <PlusIcon />
                        Add party
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
