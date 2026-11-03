import { useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router'
import { ArchiveIcon, LayoutDashboardIcon, LogOutIcon, PlusIcon, SearchIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { BALANCE_LABELS, balanceDirection, sortParties } from '@/domain/ledger'
import { useAppDispatch, useAppSelector } from '@/store'
import { signOut } from '@/features/auth/authActions'
import { UserAvatar } from '@/features/auth/UserAvatar'
import { useCashbook, useFormatters } from '@/features/cashbook/useCashbook'
import { cn, pluralize } from '@/lib/utils'
import { useLayout } from './LayoutContext'

const AMOUNT_COLOR = { in: 'text-income', out: 'text-expense', settled: 'text-muted-foreground' } as const

export function PartiesPanel({ onNavigate }: { onNavigate?: () => void }) {
  const { active, archived, overall, outstanding, settings, workspaceQuery, ledgersQuery, mode } = useCashbook()
  const fmt = useFormatters(settings)
  const { openAddParty } = useLayout()
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const location = useLocation()
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const sorted = sortParties(active, settings.partySort, settings.partySortDir)
    return q ? sorted.filter((s) => s.party.name.toLowerCase().includes(q)) : sorted
  }, [active, query, settings.partySort, settings.partySortDir])

  const loading = workspaceQuery.isLoading || (ledgersQuery.isLoading && !ledgersQuery.data)
  const onOverview = location.pathname === '/' || location.pathname === ''
  const labels = BALANCE_LABELS[settings.balanceWording]

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-4">
        <NavLink to="/" onClick={onNavigate} className="rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring">
          <Logo className="text-[21px]" />
        </NavLink>
        <Button variant="soft" size="icon-sm" aria-label="Add party" title="Add party" onClick={openAddParty}>
          <PlusIcon className="size-[18px]" strokeWidth={2.2} />
        </Button>
      </div>
      <div className="border-b border-hairline px-4 py-3">
        <div className="relative flex items-center">
          <SearchIcon className="pointer-events-none absolute left-3 size-[15px] text-muted-foreground" aria-hidden="true" />
          <label htmlFor="party-search" className="sr-only">
            Search party
          </label>
          <input
            id="party-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search party…"
            className="h-9 w-full rounded-lg border border-border bg-background pl-[34px] pr-3 text-[13.5px] outline-none focus-visible:border-brand-border focus-visible:ring-[3px] focus-visible:ring-brand-soft"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 border-b border-hairline p-3 pb-4">
        {settings.sidebarTotals === 'cash' ? (
          <>
            <TotalTile label="You got" value={fmt.money(overall.totalIn)} tone="income" loading={loading} />
            <TotalTile label="You gave" value={fmt.money(overall.totalOut)} tone="expense" loading={loading} />
          </>
        ) : (
          <>
            <TotalTile
              label={labels.in}
              value={fmt.money(outstanding.in)}
              note={pluralize(outstanding.inCount, 'party', 'parties')}
              tone="income"
              loading={loading}
            />
            <TotalTile
              label={labels.out}
              value={fmt.money(outstanding.out)}
              note={pluralize(outstanding.outCount, 'party', 'parties')}
              tone="expense"
              loading={loading}
            />
          </>
        )}
      </div>

      <nav aria-label="Parties" className="flex-1 overflow-y-auto">
        <NavLink
          to="/"
          end
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 border-b border-hairline px-4 py-3 outline-none focus-visible:bg-muted',
            onOverview && 'bg-brand-soft',
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-softer text-brand-strong">
            <LayoutDashboardIcon className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm font-semibold">Overview</span>
            <span className="text-xs text-muted-foreground">All {active.length} parties</span>
          </span>
        </NavLink>

        {loading &&
          Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-hairline px-4 py-3">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-14" />
            </div>
          ))}

        {!loading &&
          visible.map(({ party, totals }) => {
            const dir = balanceDirection(totals.balance)
            return (
              <NavLink
                key={party.id}
                to={`/parties/${party.id}`}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 border-b border-hairline px-4 py-3 outline-none hover:bg-background focus-visible:bg-muted',
                    isActive && 'bg-brand-soft hover:bg-brand-soft',
                  )
                }
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-softer text-sm font-bold text-brand-strong"
                  aria-hidden="true"
                >
                  {party.name.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground wrap-break-word">
                    {party.name}
                  </span>
                  <span className="text-xs text-subtle-foreground">
                    {totals.lastDate ? `Last entry ${fmt.dayMonth(totals.lastDate)}` : 'No entries yet'}
                  </span>
                </span>
                <span className="flex flex-col items-end">
                  <span className={cn('tabular text-sm font-bold', AMOUNT_COLOR[dir])}>
                    {fmt.money(Math.abs(totals.balance))}
                  </span>
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    {fmt.caption(totals.balance, { short: true })}
                  </span>
                </span>
              </NavLink>
            )
          })}

        {!loading && visible.length === 0 && (
          <p className="px-4 py-5 text-[13px] text-muted-foreground">
            {query ? `No party matches “${query}”.` : 'No parties yet. Use + to add your first one.'}
          </p>
        )}

        {archived.length > 0 && (
          <NavLink
            to="/?view=archived"
            onClick={onNavigate}
            className="mx-2 my-2 flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[13.5px] text-subtle-foreground outline-none hover:bg-muted focus-visible:bg-muted"
          >
            <ArchiveIcon className="size-4" aria-hidden="true" />
            Archived parties ({archived.length})
          </NavLink>
        )}
      </nav>

      {/* Same height as the party page's action bar: py-4 around an h-12 button, plus the border. */}
      <div className="box-content flex h-12 shrink-0 items-center gap-2.5 border-t border-border px-3 py-4">
        <UserAvatar user={user} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">{user?.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {mode === 'demo' ? 'Demo · data stays in this browser' : user?.email}
          </span>
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={mode === 'demo' ? 'Leave demo' : 'Sign out'}
          title={mode === 'demo' ? 'Leave demo' : 'Sign out'}
          onClick={() => void dispatch(signOut())}
        >
          <LogOutIcon className="size-[18px]" />
        </Button>
      </div>
    </div>
  )
}

function TotalTile({
  label,
  value,
  note,
  tone,
  loading,
}: {
  label: string
  value: string
  note?: string
  tone: 'income' | 'expense'
  loading: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-[10px] border p-3',
        tone === 'income' ? 'border-income-border bg-income-soft text-income' : 'border-expense-border bg-expense-soft text-expense',
      )}
    >
      <div className="text-[10.5px] font-bold uppercase tracking-[0.05em]">{label}</div>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-20 bg-white/70" />
      ) : (
        <div className="tabular mt-1 truncate text-[19px] font-bold" title={value}>
          {value}
        </div>
      )}
      {note && <div className="mt-0.5 text-[11.5px] font-medium opacity-80">{loading ? ' ' : note}</div>}
    </div>
  )
}
