import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { fieldA11y } from '@/lib/a11y'
import { Input } from '@/components/ui/input'
import { validateParty, type FieldErrors } from '@/domain/schemas'
import type { PartyInput, Workspace } from '@/domain/types'
import { useAddPartyMutation, type AppError } from '@/store/api'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspace: Workspace
}

export function AddPartyDialog({ open, onOpenChange, workspace }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        {open && <AddPartyForm workspace={workspace} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function AddPartyForm({ workspace, onDone }: { workspace: Workspace; onDone: () => void }) {
  const navigate = useNavigate()
  const [addParty, { isLoading }] = useAddPartyMutation()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState<FieldErrors<keyof PartyInput>>({})
  const [failure, setFailure] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setFailure('')
    const result = validateParty(
      { name, phone, email: '', defaultMethod: workspace.settings.paymentMethods[0] ?? '', notes: '', outLabel: '', inLabel: '' },
      { otherNames: workspace.parties.map((p) => p.name) },
    )
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    const res = await addParty({ spreadsheetId: workspace.spreadsheetId, input: result.value })
    if ('error' in res) {
      setFailure((res.error as AppError).message)
      return
    }
    toast.success(`Tab “${res.data.name}” added to ${workspace.title}`)
    onDone()
    navigate(`/parties/${res.data.id}`)
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Add party</DialogTitle>
        <DialogDescription>A customer, supplier or anyone you exchange cash with.</DialogDescription>
      </DialogHeader>
      <Field label="Party name" htmlFor="new-party-name" error={errors.name}>
        <Input
          {...fieldA11y('new-party-name', errors.name)}
          value={name}
          autoFocus
          autoComplete="off"
          placeholder="e.g. Sharma Traders"
          onChange={(e) => {
            setName(e.target.value)
            setErrors((x) => ({ ...x, name: undefined }))
          }}
        />
      </Field>
      <Field label="Phone" optional htmlFor="new-party-phone" error={errors.phone}>
        <Input
          {...fieldA11y('new-party-phone', errors.phone)}
          type="tel"
          value={phone}
          autoComplete="off"
          onChange={(e) => {
            setPhone(e.target.value)
            setErrors((x) => ({ ...x, phone: undefined }))
          }}
        />
      </Field>
      <p className="text-[12.5px] text-muted-foreground">
        A new tab with this name is added to {workspace.title}.
      </p>
      {failure && (
        <p role="alert" className="rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">
          {failure}
        </p>
      )}
      <DialogFooter>
        <Button variant="secondary" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="brand" disabled={isLoading}>
          {isLoading ? 'Adding…' : 'Add party'}
        </Button>
      </DialogFooter>
    </form>
  )
}
