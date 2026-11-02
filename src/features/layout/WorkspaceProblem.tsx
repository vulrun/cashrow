import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { AlertTriangleIcon, FileSpreadsheetIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { config } from '@/config/env'
import { useAppDispatch, useAppSelector } from '@/store'
import { useInitializeSpreadsheetMutation, type AppError } from '@/store/api'
import { workspaceCleared } from '@/store/workspaceSlice'

/** Full-page state when the chosen spreadsheet can't be opened. */
export function WorkspaceProblem({ error, onRetry }: { error: AppError; onRetry: () => void }) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const spreadsheetId = useAppSelector((s) => s.workspace.spreadsheetId) ?? ''
  const [initialize, { isLoading }] = useInitializeSpreadsheetMutation()

  const chooseAnother = () => {
    dispatch(workspaceCleared())
    navigate('/setup')
  }

  const setUp = async () => {
    const res = await initialize({ spreadsheetId })
    if ('error' in res) toast.error((res.error as AppError).message)
    else toast.success('Spreadsheet is ready')
  }

  const notSetUp = error.kind === 'notInitialized'
  const retryable = ['quota', 'network', 'server', 'unknown'].includes(error.kind)

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <span
          className={
            notSetUp
              ? 'flex size-11 items-center justify-center rounded-xl bg-income-soft text-income'
              : 'flex size-11 items-center justify-center rounded-xl bg-expense-soft text-expense'
          }
        >
          {notSetUp ? <FileSpreadsheetIcon className="size-5" /> : <AlertTriangleIcon className="size-5" />}
        </span>
        <div>
          <h1 className="text-lg font-bold">{notSetUp ? 'Set up this spreadsheet?' : "Couldn't open your spreadsheet"}</h1>
          <p className="mt-1.5 text-[13.5px] text-subtle-foreground">
            {notSetUp
              ? `${config.appName} adds one tab called __Settings to keep its settings and your list of parties. Your existing tabs are not touched.`
              : error.message}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={chooseAnother}>
            Choose another spreadsheet
          </Button>
          {notSetUp && (
            <Button variant="brand" onClick={setUp} disabled={isLoading}>
              {isLoading ? 'Setting up…' : 'Set it up'}
            </Button>
          )}
          {retryable && (
            <Button variant="brand" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
