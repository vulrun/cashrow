import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type AuthMode = 'google' | 'demo'

export interface AuthUser {
  email: string
  name: string
  picture?: string
}

export interface AuthState {
  mode: AuthMode | null
  user: AuthUser | null
  /** OAuth access token (Google mode only). Kept in sessionStorage, never localStorage. */
  token: string | null
  /** Epoch ms when the token stops working. */
  expiresAt: number | null
  /**
   * signedOut: show the sign-in screen.
   * active:    requests can run.
   * expired:   we know who you are but need a fresh token ("Continue with Google").
   */
  status: 'signedOut' | 'active' | 'expired'
}

export const initialAuthState: AuthState = {
  mode: null,
  user: null,
  token: null,
  expiresAt: null,
  status: 'signedOut',
}

/** Treat tokens as expired slightly early so a request never races the deadline. */
export const TOKEN_SAFETY_MS = 60_000

export function isTokenValid(state: Pick<AuthState, 'token' | 'expiresAt'>, now = Date.now()): boolean {
  return !!state.token && !!state.expiresAt && state.expiresAt - TOKEN_SAFETY_MS > now
}

const authSlice = createSlice({
  name: 'auth',
  initialState: initialAuthState,
  reducers: {
    signedIn(
      _state,
      action: PayloadAction<{ mode: AuthMode; user: AuthUser; token: string | null; expiresAt: number | null }>,
    ) {
      return { ...action.payload, status: 'active' }
    },
    tokenRefreshed(state, action: PayloadAction<{ token: string; expiresAt: number }>) {
      state.token = action.payload.token
      state.expiresAt = action.payload.expiresAt
      state.status = 'active'
    },
    sessionExpired(state) {
      if (state.mode !== 'google') return
      state.token = null
      state.expiresAt = null
      state.status = 'expired'
    },
    signedOut() {
      return initialAuthState
    },
  },
})

export const { signedIn, tokenRefreshed, sessionExpired, signedOut } = authSlice.actions
export default authSlice.reducer
