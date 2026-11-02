import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DEMO_SPREADSHEET_ID } from '@/backend'
import type { Party, Workspace } from '@/domain/types'
import { useSetPartyArchivedMutation, type AppError } from '@/store/api'

interface Props {
  party: Party | null
  workspace: Workspace
  onOpenChange: (open: boolean) => void
}

export function ArchivePartyDialog({ party, workspace, onOpenChange }: Props) {
  const [setArchived, { isLoading }] = useSetPartyArchivedMutation()
  const isDemo = workspace.spreadsheetId === DEMO_SPREADSHEET_ID

  async function archive() {
    if (!party) return
    const args = { spreadsheetId: workspace.spreadsheetId, partyId: party.id }
    const res = await setArchived({ ...args, archived: true })
    if ('error' in res) {
      toast.error((res.error as AppError).message)
      return
    }
    onOpenChange(false)
    toast(`${party.name} archived`, {
      description: isDemo ? 'Moved to Archived parties.' : 'Its tab is now hidden in Google Sheets.',
      action: {
        label: 'Undo',
        onClick: () => {
          void setArchived({ ...args, archived: false }).then((r) => {
            if ('error' in r) toast.error((r.error as AppError).message)
          })
        },
      },
    })
  }

  return (
    <Dialog open={!!party} onOpenChange={onOpenChange}>
      <DialogContent role="alertdialog" className="max-w-[400px]" hideClose>
        <DialogHeader className="pr-0">
          <DialogTitle>Archive {party?.name}?</DialogTitle>
          <DialogDescription className="text-[13.5px] text-subtle-foreground">
            {isDemo
              ? 'The party moves to Archived. No entries are deleted, and you can restore it any time.'
              : 'Its tab is hidden in Google Sheets and the party moves to Archived. No entries are deleted, and you can restore it any time.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="dark" onClick={archive} disabled={isLoading}>
            {isLoading ? 'Archiving…' : 'Archive'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
