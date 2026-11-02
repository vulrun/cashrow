import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit'
import { config } from '@/config/env'
import { DEMO_SPREADSHEET_ID, resetDemoData } from '@/backend'
import { fetchGoogleUser, requestAccessToken, revokeAccessToken } from '@/google/gis'
import type { RootState } from '@/store'
import { api } from '@/store/api'
import { signedIn, signedOut, tokenRefreshed } from '@/store/authSlice'
import { workspaceCleared, workspaceSelected } from '@/store/workspaceSlice'

type Thunk<R = Promise<void>> = ThunkAction<R, RootState, unknown, UnknownAction>

export const DEMO_USER = { name: 'Demo user', email: 'demo@example.com' }

/** First sign-in. Must run inside a click handler (Google opens a popup). */
export function signInWithGoogle(): Thunk {
  return async (dispatch, getState) => {
    const token = await requestAccessToken({ clientId: config.googleClientId, prompt: 'select_account' })
    const user = await fetchGoogleUser(token.token)
    const { workspace } = getState()
    // A different account should not inherit the previous account's spreadsheet.
    if (workspace.ownerEmail && workspace.ownerEmail !== user.email) dispatch(workspaceCleared())
    dispatch(api.util.resetApiState())
    dispatch(signedIn({ mode: 'google', user, token: token.token, expiresAt: token.expiresAt }))
  }
}

/** Gets a fresh token for the remembered account, without the consent screen. */
export function continueSession(): Thunk {
  return async (dispatch, getState) => {
    const { user } = getState().auth
    const token = await requestAccessToken({ clientId: config.googleClientId, prompt: '', hint: user?.email })
    dispatch(tokenRefreshed(token))
    // Re-run whatever failed while the session was expired.
    dispatch(api.util.invalidateTags(['Spreadsheets', 'Workspace', 'Ledgers']))
  }
}

export function startDemo(): Thunk<void> {
  return (dispatch) => {
    dispatch(api.util.resetApiState())
    dispatch(signedIn({ mode: 'demo', user: DEMO_USER, token: null, expiresAt: null }))
    dispatch(workspaceSelected({ spreadsheetId: DEMO_SPREADSHEET_ID, ownerEmail: DEMO_USER.email }))
  }
}

export function signOut(opts: { resetDemo?: boolean } = {}): Thunk {
  return async (dispatch, getState) => {
    const { auth } = getState()
    if (auth.mode === 'google' && auth.token) await revokeAccessToken(auth.token)
    if (auth.mode === 'demo') {
      dispatch(workspaceCleared())
      if (opts.resetDemo) resetDemoData()
    }
    dispatch(signedOut())
    dispatch(api.util.resetApiState())
  }
}
