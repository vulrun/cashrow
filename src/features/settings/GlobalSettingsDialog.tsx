import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { FileSpreadsheetIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DEMO_SPREADSHEET_ID } from '@/backend'
import { PARTY_SORT_OPTIONS } from '@/domain/ledger'
import { validateMethodName } from '@/domain/schemas'
import type { BalanceWording, GlobalSettings, PartySortKey, SidebarTotals, SortDir, Workspace } from '@/domain/types'
import type { DateFormat } from '@/lib/dates'
import { CURRENCIES } from '@/lib/money'
import { useAppDispatch } from '@/store'
import { useSaveSettingsMutation, type AppError } from '@/store/api'
import { workspaceCleared } from '@/store/workspaceSlice'

const DATE_FORMATS: { value: DateFormat; label: string }[] = [
  { value: 'text', label: '23 Oct 2026' },
  { value: 'dmy', label: '23/10/2026' },
  { value: 'mdy', label: '10/23/2026' },
  { value: 'iso', label: '2026-10-23' },
]

const BALANCE_WORDINGS: { value: BalanceWording; label: string }[] = [
  { value: 'net', label: 'Net in · Net out' },
  { value: 'cash', label: 'Cash in · Cash out' },
  { value: 'settle', label: "You'll give · You'll get" },
]

const SIDEBAR_TOTALS: { value: SidebarTotals; label: string }[] = [
  { value: 'balances', label: 'Total balance left' },
  { value: 'cash', label: 'Total spends done' },
]

const PARTY_ORDERS = PARTY_SORT_OPTIONS.map((o) => ({ value: `${o.by}:${o.dir}`, label: o.label }))

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace
}

export function GlobalSettingsDialog({ open, onOpenChange, workspace }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {open && <SettingsForm workspace={workspace} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SettingsForm({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [save, { isLoading }] = useSaveSettingsMutation()
  const [draft, setDraft] = useState<GlobalSettings>(() => ({
    ...workspace.settings,
    paymentMethods: [...workspace.settings.paymentMethods],
  }))
  const [newMethod, setNewMethod] = useState('')
  const [methodError, setMethodError] = useState('')
  const isDemo = workspace.spreadsheetId === DEMO_SPREADSHEET_ID

  function addMethod() {
    const error = validateMethodName(newMethod, draft.paymentMethods)
    if (error) return setMethodError(error)
    setDraft((d) => ({ ...d, paymentMethods: [...d.paymentMethods, newMethod.trim()] }))
    setNewMethod('')
    setMethodError('')
  }

  function removeMethod(method: string) {
    if (draft.paymentMethods.length <= 1) return setMethodError('Keep at least one payment method.')
    setDraft((d) => ({ ...d, paymentMethods: d.paymentMethods.filter((m) => m !== method) }))
    setMethodError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const res = await save({ spreadsheetId: workspace.spreadsheetId, settings: draft })
    if ('error' in res) {
      toast.error((res.error as AppError).message)
      return
    }
    toast.success(isDemo ? 'Settings saved' : 'Settings saved to the __Settings tab')
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Applies to every party in this spreadsheet.</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] font-semibold text-label">Spreadsheet</span>
        <div className="flex items-center gap-3 rounded-[10px] border border-border bg-background py-2.5 pl-3 pr-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-income-soft text-income">
            <FileSpreadsheetIcon className="size-[17px]" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{workspace.title}</span>
            <span className="text-xs text-muted-foreground">
              {isDemo ? 'Demo data in this browser' : `Google Sheet · ${workspace.tabCount} tabs`}
            </span>
          </span>
          {!isDemo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                dispatch(workspaceCleared())
                onDone()
                navigate('/setup')
              }}
            >
              Change
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Currency" htmlFor="settings-currency" hint="Changes symbols and digit grouping, not amounts.">
          <Select
            id="settings-currency"
            value={draft.currency}
            onValueChange={(currency) => setDraft((d) => ({ ...d, currency }))}
            options={CURRENCIES.map((c) => ({ value: c.code, label: `${c.symbol} ${c.label} (${c.code})` }))}
          />
        </Field>
        <Field label="Date format" htmlFor="settings-date-format">
          <Select
            id="settings-date-format"
            value={draft.dateFormat}
            onValueChange={(dateFormat) => setDraft((d) => ({ ...d, dateFormat: dateFormat as DateFormat }))}
            options={DATE_FORMATS}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Balance wording" htmlFor="settings-balance-wording" hint="How party balances are labelled.">
          <Select
            id="settings-balance-wording"
            value={draft.balanceWording}
            onValueChange={(balanceWording) => setDraft((d) => ({ ...d, balanceWording: balanceWording as BalanceWording }))}
            options={BALANCE_WORDINGS}
          />
        </Field>
        <Field label="Sidebar totals" htmlFor="settings-sidebar-totals" hint="Shown above the party list.">
          <Select
            id="settings-sidebar-totals"
            value={draft.sidebarTotals}
            onValueChange={(sidebarTotals) => setDraft((d) => ({ ...d, sidebarTotals: sidebarTotals as SidebarTotals }))}
            options={SIDEBAR_TOTALS}
          />
        </Field>
        <Field label="Party order" htmlFor="settings-party-order" hint="How the sidebar lists parties.">
          <Select
            id="settings-party-order"
            value={`${draft.partySort}:${draft.partySortDir}`}
            onValueChange={(order) => {
              const [partySort, partySortDir] = order.split(':') as [PartySortKey, SortDir]
              setDraft((d) => ({ ...d, partySort, partySortDir }))
            }}
            options={PARTY_ORDERS}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <span id="methods-label" className="text-[12.5px] font-semibold text-label">
          Payment methods
        </span>
        <ul aria-labelledby="methods-label" className="flex flex-wrap gap-1.5">
          {draft.paymentMethods.map((m) => (
            <li
              key={m}
              className="inline-flex h-8 items-center gap-0.5 rounded-full bg-muted pl-3 pr-[3px] text-[13px] font-medium"
            >
              {m}
              <button
                type="button"
                aria-label={`Remove ${m}`}
                onClick={() => removeMethod(m)}
                className="flex size-[26px] items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-border focus-visible:ring-[3px] focus-visible:ring-ring"
              >
                <XIcon className="size-[13px]" strokeWidth={2.4} />
              </button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <label htmlFor="settings-new-method" className="sr-only">
            New payment method
          </label>
          <Input
            id="settings-new-method"
            value={newMethod}
            placeholder="Add a method, e.g. NEFT"
            aria-invalid={methodError ? true : undefined}
            aria-describedby={methodError ? 'settings-new-method-error' : undefined}
            onChange={(e) => {
              setNewMethod(e.target.value)
              setMethodError('')
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMethod()
              }
            }}
          />
          <Button variant="secondary" onClick={addMethod}>
            Add
          </Button>
        </div>
        {methodError && (
          <p id="settings-new-method-error" className="text-[12.5px] text-expense">
            {methodError}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-[10px] border border-border py-2.5 pl-3.5 pr-1.5">
        <div>
          <div id="future-label" className="text-[13.5px] font-semibold">
            Allow future-dated entries
          </div>
          <div className="text-[12.5px] text-muted-foreground">When off, an entry can't be dated after today.</div>
        </div>
        <Switch
          aria-labelledby="future-label"
          checked={draft.allowFutureDates}
          onCheckedChange={(allowFutureDates) => setDraft((d) => ({ ...d, allowFutureDates }))}
        />
      </div>

      <DialogFooter>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isLoading}>
          {isLoading ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </form>
  )
}
