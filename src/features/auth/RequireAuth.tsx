import { useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LandingPage } from '@/features/landing/LandingPage'
import { useAppDispatch, useAppSelector } from '@/store'
import { continueSession, signOut } from './authActions'
import { GoogleMark } from './GoogleMark'

/**
 * Signed-out visitors see the landing page at / and are sent to /login from anywhere else, so "/" stays the
 * overview once signed in. Shows a re-auth dialog when the token expires.
 */
export function RequireAuth() {
  const status = useAppSelector((s) => s.auth.status)
  const location = useLocation()
  if (status === 'signedOut') {
    if (location.pathname === '/') return <LandingPage />
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return (
    <>
      <Outlet />
      <SessionExpiredDialog />
    </>
  )
}

/** Sends users without a chosen spreadsheet to /setup. */
export function RequireWorkspace() {
  const spreadsheetId = useAppSelector((s) => s.workspace.spreadsheetId)
  if (!spreadsheetId) return <Navigate to="/setup" replace />
  return <Outlet />
}

function SessionExpiredDialog() {
  const dispatch = useAppDispatch()
  const { status, user, mode } = useAppSelector((s) => s.auth)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const open = mode === 'google' && status === 'expired'

  async function resume() {
    setBusy(true)
    setError('')
    try {
      await dispatch(continueSession())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="max-w-[420px]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="pr-0">
          <DialogTitle>Continue with Google</DialogTitle>
          <DialogDescription className="text-[13.5px] text-subtle-foreground">
            Google sign-in lasts about an hour. Continue to pick up where you left off; anything you were typing is
            still here.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="secondary" disabled={busy} onClick={() => void dispatch(signOut())}>
            Sign out
          </Button>
          <Button variant="outline" disabled={busy} onClick={resume}>
            <GoogleMark className="size-4" />
            {busy ? 'Waiting for Google…' : `Continue as ${user?.email ?? 'you'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
