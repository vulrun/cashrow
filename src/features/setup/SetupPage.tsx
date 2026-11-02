import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { ChevronRightIcon, FileSpreadsheetIcon, LogOutIcon, PlusIcon } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { config } from '@/config/env'
import { formatDate } from '@/lib/dates'
import { useAppDispatch, useAppSelector } from '@/store'
import { useCreateSpreadsheetMutation, useListSpreadsheetsQuery, type AppError } from '@/store/api'
import { workspaceSelected } from '@/store/workspaceSlice'
import { signOut } from '@/features/auth/authActions'

export function SetupPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { mode, user, status } = useAppSelector((s) => s.auth)
  const ready = status === 'active'
  const list = useListSpreadsheetsQuery(undefined, { skip: !ready || mode !== 'google' })
  const [create, createState] = useCreateSpreadsheetMutation()
  const [title, setTitle] = useState(`${config.appName} cash book`)
  const [titleError, setTitleError] = useState('')

  if (mode === 'demo') return <Navigate to="/" replace />

  const open = (spreadsheetId: string) => {
    dispatch(workspaceSelected({ spreadsheetId, ownerEmail: user?.email ?? '' }))
    navigate('/')
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    const name = title.trim()
    if (!name) return setTitleError('Give the spreadsheet a name.')
    if (name.length > 100) return setTitleError('Keep the name under 100 characters.')
    const res = await create({ title: name })
    if ('error' in res) {
      toast.error((res.error as AppError).message)
      return
    }
    toast.success(`Created “${res.data.name}” in your Google Drive`)
    open(res.data.id)
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
        <Logo className="text-[21px]" />
        <div className="flex items-center gap-2 text-[13px] text-subtle-foreground">
          <span className="hidden sm:inline">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={() => void dispatch(signOut())}>
            <LogOutIcon />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-[640px] flex-col gap-5 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold">Choose where to keep your cash book</h1>
          <p className="mt-1.5 text-subtle-foreground">
            Everything is stored in a Google Sheet in your own Drive. Each party gets its own tab.
          </p>
        </div>

        <section className="rounded-[14px] border border-border bg-card p-5" aria-labelledby="create-heading">
          <h2 id="create-heading" className="flex items-center gap-2 text-[15px] font-bold">
            <PlusIcon className="size-4 text-brand" aria-hidden="true" />
            Create a new spreadsheet
          </h2>
          <form onSubmit={onCreate} noValidate className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
            <Field label="Name" htmlFor="sheet-title" error={titleError} className="flex-1">
              <Input
                id="sheet-title"
                value={title}
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? 'sheet-title-error' : undefined}
                onChange={(e) => {
                  setTitle(e.target.value)
                  setTitleError('')
                }}
              />
            </Field>
            <Button type="submit" variant="brand" className="sm:mt-[22px]" disabled={createState.isLoading || !ready}>
              {createState.isLoading ? 'Creating…' : 'Create'}
            </Button>
          </form>
        </section>

        <section className="rounded-[14px] border border-border bg-card" aria-labelledby="existing-heading">
          <div className="border-b border-hairline px-5 py-4">
            <h2 id="existing-heading" className="text-[15px] font-bold">
              Your spreadsheets
            </h2>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Cash books this app created in your Drive</p>
          </div>
          <ul className="divide-y divide-hairline">
            {list.isLoading &&
              Array.from({ length: 2 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </li>
              ))}
            {list.data?.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => open(s.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left outline-none hover:bg-background focus-visible:bg-muted"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-income-soft text-income">
                    <FileSpreadsheetIcon className="size-[18px]" aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{s.name}</span>
                    {s.modifiedTime && (
                      <span className="text-xs text-muted-foreground">Edited {formatDate(s.modifiedTime.slice(0, 10))}</span>
                    )}
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden="true" />
                </button>
              </li>
            ))}
            {list.data?.length === 0 && (
              <li className="px-5 py-6 text-[13.5px] text-muted-foreground">
                No cash books yet. Create one above to get started.
              </li>
            )}
            {list.error && (
              <li role="alert" className="flex items-center justify-between gap-3 px-5 py-4 text-[13.5px] text-expense">
                {(list.error as AppError).message}
                <Button variant="secondary" size="sm" onClick={() => void list.refetch()}>
                  Try again
                </Button>
              </li>
            )}
          </ul>
        </section>

        <p className="text-[12.5px] text-muted-foreground">
          The app can only see the spreadsheets it created. It can't read anything else in your Drive.
        </p>
      </main>
    </div>
  )
}
