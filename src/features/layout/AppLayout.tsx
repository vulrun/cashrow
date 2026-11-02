import { useMemo, useState } from 'react'
import { Outlet } from 'react-router'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import type { Party } from '@/domain/types'
import { useCashbook } from '@/features/cashbook/useCashbook'
import { AddPartyDialog } from '@/features/parties/AddPartyDialog'
import { ArchivePartyDialog } from '@/features/parties/ArchivePartyDialog'
import { GlobalSettingsDialog } from '@/features/settings/GlobalSettingsDialog'
import { LayoutContext, type LayoutActions } from './LayoutContext'
import { PartiesPanel } from './PartiesPanel'
import { WorkspaceProblem } from './WorkspaceProblem'

export function AppLayout() {
  const { ws, workspaceQuery } = useCashbook()
  const [addOpen, setAddOpen] = useState(false)
  const [partiesOpen, setPartiesOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Party | null>(null)

  const actions = useMemo<LayoutActions>(
    () => ({
      openAddParty: () => {
        setPartiesOpen(false)
        setAddOpen(true)
      },
      openParties: () => setPartiesOpen(true),
      openGlobalSettings: () => setSettingsOpen(true),
      requestArchive: (party) => setArchiveTarget(party),
    }),
    [],
  )

  const error = workspaceQuery.error
  if (error && !ws && 'kind' in error && error.kind !== 'auth') {
    return <WorkspaceProblem error={error} onRetry={() => void workspaceQuery.refetch()} />
  }

  return (
    <LayoutContext.Provider value={actions}>
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[320px] shrink-0 xl:w-[344px] border-r border-border md:block">
          <PartiesPanel />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </main>
      </div>

      <Sheet open={partiesOpen} onOpenChange={setPartiesOpen}>
        <SheetContent side="left" className="max-w-[340px]">
          <SheetTitle className="sr-only">Parties</SheetTitle>
          <SheetDescription className="sr-only">Switch between parties</SheetDescription>
          <PartiesPanel onNavigate={() => setPartiesOpen(false)} />
        </SheetContent>
      </Sheet>

      {ws && (
        <>
          <AddPartyDialog open={addOpen} onOpenChange={setAddOpen} workspace={ws} />
          <GlobalSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} workspace={ws} />
          <ArchivePartyDialog
            party={archiveTarget}
            workspace={ws}
            onOpenChange={(open) => !open && setArchiveTarget(null)}
          />
        </>
      )}
    </LayoutContext.Provider>
  )
}
