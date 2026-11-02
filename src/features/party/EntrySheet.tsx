import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeftIcon, ArrowUpRightIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { Field } from '@/components/ui/field'
import { fieldA11y } from '@/lib/a11y'
import { Segmented } from '@/components/ui/segmented'
import { Select } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { DEMO_SPREADSHEET_ID } from '@/backend'
import { entryLabels } from '@/domain/ledger'
import { LIMITS, validateEntry, type EntryDraft, type FieldErrors } from '@/domain/schemas'
import type { Entry, EntryType, Party, Workspace } from '@/domain/types'
import { formatDate, type IsoDate } from '@/lib/dates'
import { currencyInfo, formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'
import { useAddEntryMutation, useUpdateEntryMutation, type AppError } from '@/store/api'

export type PanelState =
  | { mode: 'new'; type: EntryType; carry?: { date: IsoDate; method: string }; nonce: number }
  | { mode: 'edit'; entryId: string }

interface EntrySheetProps {
  panel: PanelState | null
  onClose: () => void
  onSaved: (entry: Entry, opts: { andNew: boolean; draft: EntryDraft }) => void
  status: string
  onStatusClear: () => void
  party: Party
  workspace: Workspace
  entries: Entry[]
  balances: Map<string, number>
  today: IsoDate
  /** Open the date calendar immediately (used for screenshots). */
  defaultCalendarOpen?: boolean
}

export function EntrySheet({ panel, onClose, ...rest }: EntrySheetProps) {
  const entry = panel?.mode === 'edit' ? rest.entries.find((e) => e.id === panel.entryId) : undefined
  const key = !panel ? 'closed' : panel.mode === 'edit' ? `edit-${panel.entryId}` : `new-${panel.nonce}`

  return (
    <Sheet open={!!panel} onOpenChange={(open) => !open && onClose()}>
      <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
        {panel && (panel.mode === 'new' || entry) && <EntryForm key={key} panel={panel} entry={entry} {...rest} />}
      </SheetContent>
    </Sheet>
  )
}

function EntryForm({
  panel,
  entry,
  onSaved,
  status,
  onStatusClear,
  party,
  workspace,
  balances,
  today,
  defaultCalendarOpen,
}: Omit<EntrySheetProps, 'panel' | 'onClose' | 'entries'> & { panel: PanelState; entry?: Entry }) {
  const settings = workspace.settings
  const methods = settings.paymentMethods
  const isDemo = workspace.spreadsheetId === DEMO_SPREADSHEET_ID
  const amountRef = useRef<HTMLInputElement>(null)

  const [draft, setDraft] = useState<EntryDraft>(() =>
    entry
      ? { type: entry.type, amount: String(entry.amount), date: entry.date, method: entry.method, notes: entry.notes }
      : {
          type: panel.mode === 'new' ? panel.type : 'IN',
          amount: '',
          date: (panel.mode === 'new' && panel.carry?.date) || today,
          method:
            (panel.mode === 'new' && panel.carry?.method) || party.defaultMethod || methods[0] || '',
          notes: '',
        },
  )
  const [errors, setErrors] = useState<FieldErrors<keyof EntryDraft>>({})
  const [failure, setFailure] = useState('')
  const [addEntry, addState] = useAddEntryMutation()
  const [updateEntry, updateState] = useUpdateEntryMutation()
  const saving = addState.isLoading || updateState.isLoading

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  const methodOptions = (methods.includes(draft.method) || !draft.method ? methods : [draft.method, ...methods]).map(
    (m) => ({ value: m, label: m }),
  )
  const isIn = draft.type === 'IN'
  const labels = entryLabels(party)
  const symbol = currencyInfo(settings.currency).symbol

  function change<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
    setFailure('')
    if (status) onStatusClear()
  }

  async function submit(andNew: boolean) {
    if (saving) return
    const result = validateEntry(draft, { today, allowFutureDates: settings.allowFutureDates, methods })
    if (!result.ok) {
      setErrors(result.errors)
      if (result.errors.amount) amountRef.current?.focus()
      return
    }
    setFailure('')
    const args = { spreadsheetId: workspace.spreadsheetId, partyId: party.id }
    const res = entry
      ? await updateEntry({ ...args, entry, input: result.value })
      : await addEntry({ ...args, input: result.value })
    if ('error' in res) {
      setFailure((res.error as AppError).message)
      return
    }
    onSaved(res.data, { andNew, draft })
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      void submit(e.shiftKey)
    }
  }

  const title = entry ? 'Edit entry' : isIn ? labels.inAction : labels.outAction
  const description = entry
    ? `${party.name} · ${formatDate(entry.date, settings.dateFormat)}`
    : `${party.name} · ${isDemo ? 'new entry' : 'new row in the tab'}`

  return (
    <form
      noValidate
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        e.preventDefault()
        void submit(false)
      }}
      className="flex h-full flex-col"
    >
      <SheetHeader title={title} description={description} />

      <div className="flex flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] pb-[22px] pt-1">
        <Segmented
          size="lg"
          aria-label="Entry type"
          value={draft.type}
          onValueChange={(t) => change('type', t)}
          options={[
            {
              value: 'OUT',
              activeClassName: 'text-expense data-[state=on]:text-expense',
              label: (
                <>
                  <ArrowUpRightIcon className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
                  {labels.out}
                </>
              ),
            },
            {
              value: 'IN',
              activeClassName: 'text-income data-[state=on]:text-income',
              label: (
                <>
                  <ArrowDownLeftIcon className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
                  {labels.in}
                </>
              ),
            },
          ]}
        />

        <Field label="Amount" htmlFor="entry-amount" error={errors.amount}>
          <div className="relative flex items-center">
            <span
              aria-hidden="true"
              className={cn('pointer-events-none absolute left-3.5 text-[22px] font-bold', isIn ? 'text-income' : 'text-expense')}
            >
              {symbol}
            </span>
            <input
              ref={amountRef}
              {...fieldA11y('entry-amount', errors.amount)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={draft.amount}
              onChange={(e) => change('amount', e.target.value)}
              style={{ paddingLeft: `${Math.max(36, 20 + symbol.length * 13)}px` }}
              className={cn(
                'tabular h-14 w-full rounded-xl border border-input bg-background pr-3.5 text-2xl font-bold outline-none focus-visible:border-brand-border focus-visible:ring-[3px] focus-visible:ring-brand-soft aria-invalid:border-expense',
                isIn ? 'text-income' : 'text-expense',
              )}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" htmlFor="entry-date" error={errors.date}>
            <DatePicker
              id="entry-date"
              value={draft.date}
              onChange={(d) => change('date', d)}
              today={today}
              max={settings.allowFutureDates ? undefined : today}
              dateFormat={settings.dateFormat}
              defaultOpen={defaultCalendarOpen}
              aria-invalid={errors.date ? true : undefined}
              aria-describedby={errors.date ? 'entry-date-error' : undefined}
            />
          </Field>
          <Field label="Payment method" htmlFor="entry-method" error={errors.method}>
            <Select
              id="entry-method"
              value={draft.method}
              onValueChange={(m) => change('method', m)}
              options={methodOptions}
              placeholder="Choose…"
              aria-invalid={errors.method ? true : undefined}
            />
          </Field>
        </div>

        <Field
          label="Note"
          htmlFor="entry-notes"
          error={errors.notes}
          aside={
            <span className={draft.notes.length > LIMITS.notes ? 'text-expense' : undefined}>
              {draft.notes.length}/{LIMITS.notes}
            </span>
          }
        >
          <Textarea
            {...fieldA11y('entry-notes', errors.notes)}
            rows={3}
            placeholder="Invoice no., reference…"
            value={draft.notes}
            onChange={(e) => change('notes', e.target.value)}
          />
        </Field>

        {entry && (
          <dl className="flex flex-col gap-1.5 rounded-[10px] bg-background px-3.5 py-3 text-[12.5px] text-subtle-foreground">
            <div className="flex justify-between gap-3">
              <dt>{isDemo ? 'Row' : 'Sheet row'}</dt>
              <dd className="font-semibold text-foreground">
                Row {entry.row} · “{party.name}” tab
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Balance after this entry</dt>
              <dd className="tabular font-semibold text-foreground">
                {formatMoney(balances.get(entry.id) ?? 0, settings.currency)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="flex flex-col gap-2.5 border-t border-hairline px-[22px] pb-[18px] pt-3.5">
        {status && !failure && (
          <p role="status" className="flex items-center gap-1.5 text-[12.5px] font-semibold text-income">
            <CheckIcon className="size-[15px]" strokeWidth={2.4} aria-hidden="true" />
            {status}
          </p>
        )}
        {failure && (
          <p role="alert" className="rounded-lg bg-expense-soft px-3 py-2 text-[12.5px] text-expense">
            {failure}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="secondary" className="h-11 font-bold" disabled={saving} onClick={() => void submit(true)}>
            Save &amp; add new
          </Button>
          <Button
            type="submit"
            variant={isIn ? 'incomeSolid' : 'expenseSolid'}
            className="h-11 font-bold"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
        <p className="text-center text-[11.5px] text-muted-foreground">
          <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Enter</kbd> to save ·{' '}
          <kbd className="font-sans">Ctrl</kbd> + <kbd className="font-sans">Shift</kbd> + <kbd className="font-sans">Enter</kbd> to
          save and add new
        </p>
      </div>
    </form>
  )
}
