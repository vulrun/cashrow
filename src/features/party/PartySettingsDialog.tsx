import { useState } from 'react'
import { toast } from 'sonner'
import { ArchiveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { fieldA11y } from '@/lib/a11y'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DEMO_SPREADSHEET_ID } from '@/backend'
import { LIMITS, validateParty, type FieldErrors } from '@/domain/schemas'
import type { Party, PartyInput, Workspace } from '@/domain/types'
import { formatDate } from '@/lib/dates'
import { useUpdatePartyMutation, type AppError } from '@/store/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  party: Party
  workspace: Workspace
  entryCount: number
  onArchive: () => void
}

export function PartySettingsDialog({ open, onOpenChange, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        {open && <PartySettingsForm {...rest} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function PartySettingsForm({
  party,
  workspace,
  entryCount,
  onArchive,
  onDone,
}: Omit<Props, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const [updateParty, { isLoading }] = useUpdatePartyMutation()
  const [draft, setDraft] = useState<PartyInput>({
    name: party.name,
    phone: party.phone,
    email: party.email,
    defaultMethod: party.defaultMethod || workspace.settings.paymentMethods[0] || '',
    notes: party.notes,
    outLabel: party.outLabel,
    inLabel: party.inLabel,
  })
  const [errors, setErrors] = useState<FieldErrors<keyof PartyInput>>({})
  const isDemo = workspace.spreadsheetId === DEMO_SPREADSHEET_ID

  const set = <K extends keyof PartyInput>(key: K, value: PartyInput[K]) => {
    setDraft((d) => ({ ...d, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const methods = workspace.settings.paymentMethods.includes(draft.defaultMethod)
    ? workspace.settings.paymentMethods
    : [draft.defaultMethod, ...workspace.settings.paymentMethods].filter(Boolean)

  const newName = draft.name.trim().replace(/\s+/g, ' ')
  const renameNote =
    newName && newName !== party.name
      ? `The tab will be renamed from “${party.name}” to “${newName}”.`
      : isDemo
        ? 'The name shown everywhere in the app.'
        : 'Renaming the party also renames its tab in Google Sheets.'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateParty(draft, {
      otherNames: workspace.parties.filter((p) => p.id !== party.id).map((p) => p.name),
    })
    if (!result.ok) return setErrors(result.errors)
    const res = await updateParty({ spreadsheetId: workspace.spreadsheetId, partyId: party.id, input: result.value })
    if ('error' in res) {
      toast.error((res.error as AppError).message)
      return
    }
    const renamed = result.value.name !== party.name
    toast.success(renamed && !isDemo ? `Saved. Tab renamed to “${result.value.name}”.` : 'Party settings saved')
    onDone()
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Party settings</DialogTitle>
        <DialogDescription>
          {party.createdAt ? `Party since ${formatDate(party.createdAt.slice(0, 10), workspace.settings.dateFormat)} · ` : ''}
          {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
        </DialogDescription>
      </DialogHeader>

      <Field label="Party name" htmlFor="party-name" error={errors.name} hint={renameNote}>
        <Input
          {...fieldA11y('party-name', errors.name, true)}
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phone" optional htmlFor="party-phone" error={errors.phone}>
          <Input
            {...fieldA11y('party-phone', errors.phone)}
            type="tel"
            placeholder="+91 98xxx xxxxx"
            value={draft.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>
        <Field label="Email" optional htmlFor="party-email" error={errors.email}>
          <Input
            {...fieldA11y('party-email', errors.email)}
            type="email"
            placeholder="name@company.com"
            value={draft.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
      </div>

      <Field
        label="Default payment method"
        htmlFor="party-method"
        hint="Pre-selected when you give or get cash with this party."
      >
        <Select
          id="party-method"
          aria-describedby="party-method-hint"
          value={draft.defaultMethod}
          onValueChange={(v) => set('defaultMethod', v)}
          options={methods.map((m) => ({ value: m, label: m }))}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Cash out label" optional htmlFor="party-out-label" error={errors.outLabel}>
            <Input
              {...fieldA11y('party-out-label', errors.outLabel)}
              aria-describedby={errors.outLabel ? 'party-out-label-error' : 'party-labels-hint'}
              placeholder="Cash out"
              value={draft.outLabel}
              onChange={(e) => set('outLabel', e.target.value)}
            />
          </Field>
          <Field label="Cash in label" optional htmlFor="party-in-label" error={errors.inLabel}>
            <Input
              {...fieldA11y('party-in-label', errors.inLabel)}
              aria-describedby={errors.inLabel ? 'party-in-label-error' : 'party-labels-hint'}
              placeholder="Cash in"
              value={draft.inLabel}
              onChange={(e) => set('inLabel', e.target.value)}
            />
          </Field>
        </div>
        <p id="party-labels-hint" className="text-xs text-muted-foreground">
          Rename the two sides for this party, e.g. You paid / You owe. Leave blank for Cash out / Cash in.
        </p>
      </div>

      <Field
        label="Notes"
        optional
        htmlFor="party-notes"
        error={errors.notes}
        aside={`${draft.notes.length}/${LIMITS.partyNotes}`}
      >
        <Textarea
          {...fieldA11y('party-notes', errors.notes)}
          rows={3}
          placeholder="GSTIN, address, contact person…"
          value={draft.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>

      <DialogFooter className="justify-between border-t border-hairline pt-3.5">
        <Button variant="dangerText" onClick={onArchive}>
          <ArchiveIcon />
          Archive party
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" variant="brand" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  )
}
