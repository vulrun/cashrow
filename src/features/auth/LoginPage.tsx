import { useState } from 'react'
import { Navigate } from 'react-router'
import { InfoIcon, LockIcon } from 'lucide-react'
import { AppTile, Wordmark } from '@/components/brand/Logo'
import { Button } from '@/components/ui/button'
import { config, isGoogleConfigured } from '@/config/env'
import { SETUP_GUIDE_URL } from '@/config/project'
import { useAppDispatch, useAppSelector } from '@/store'
import { continueSession, signInWithGoogle, signOut, startDemo } from './authActions'
import { GoogleMark } from './GoogleMark'


export function LoginPage() {
  const dispatch = useAppDispatch()
  const auth = useAppSelector((s) => s.auth)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const googleReady = isGoogleConfigured()

  if (auth.status === 'active') return <Navigate to="/" replace />

  const returning = auth.status === 'expired' && auth.user

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <main className="flex w-full max-w-[400px] flex-col gap-6 rounded-2xl border border-border bg-card p-7 shadow-[0_1px_2px_rgba(14,23,38,0.04)]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AppTile className="size-14 shadow-[0_6px_16px_rgba(52,72,214,0.28)]" />
          <div>
            {returning ? (
              <h1 className="text-xl font-bold">Welcome back, {auth.user?.name.split(' ')[0]}</h1>
            ) : (
              <h1 className="text-[28px] leading-tight">
                <Wordmark />
              </h1>
            )}
            <p className="mt-1.5 text-[13.5px] text-subtle-foreground">
              {returning
                ? 'Your Google session has ended. Continue to pick up where you left off.'
                : 'Track cash in and cash out for every party. Your data stays in your own Google Sheet.'}
            </p>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-expense-soft px-3 py-2 text-[13px] text-expense">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-2.5">
          {googleReady ? (
            returning ? (
              <>
                <Button variant="outline" size="lg" disabled={busy} onClick={() => run(() => dispatch(continueSession()))}>
                  <GoogleMark className="size-[18px]" />
                  Continue as {auth.user?.email}
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => run(() => dispatch(signOut()))}>
                  Use another account
                </Button>
              </>
            ) : (
              <Button variant="outline" size="lg" disabled={busy} onClick={() => run(() => dispatch(signInWithGoogle()))}>
                <GoogleMark className="size-[18px]" />
                {busy ? 'Waiting for Google…' : 'Sign in with Google'}
              </Button>
            )
          ) : (
            <div className="flex gap-2.5 rounded-[10px] border border-border bg-background p-3 text-[13px] text-subtle-foreground">
              <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden="true" />
              <p>
                Google sign-in isn't set up on this site yet. The site owner needs to add a Google OAuth client ID
                (<code className="text-[12px]">VITE_GOOGLE_CLIENT_ID</code>).{' '}
                <a className="font-semibold text-brand-strong underline-offset-2 hover:underline" href={SETUP_GUIDE_URL} target="_blank" rel="noreferrer">
                  Setup guide
                </a>
              </p>
            </div>
          )}

          {config.demoEnabled && !returning && (
            <Button variant="secondary" size="lg" disabled={busy} onClick={() => dispatch(startDemo())}>
              Try the demo
            </Button>
          )}
        </div>

        <p className="flex items-start gap-2 text-[12px] text-muted-foreground">
          <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          The app runs in your browser and talks to Google directly. There is no server and no tracking. It can only see
          the spreadsheets it creates.
        </p>
      </main>
    </div>
  )
}
