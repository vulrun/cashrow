import { initialAuthState, isTokenValid, type AuthState } from './authSlice'
import { initialWorkspaceState, type WorkspaceState } from './workspaceSlice'

/**
 * Session persistence.
 *  - localStorage:   who you are, sign-in mode, chosen spreadsheet (survives restarts)
 *  - sessionStorage: the access token (this tab only, gone when the tab closes)
 */

const SESSION_KEY = 'cashrow.session'
const TOKEN_KEY = 'cashrow.token'

interface StoredSession {
  mode: AuthState['mode']
  user: AuthState['user']
  spreadsheetId: string | null
  ownerEmail: string | null
}

interface StoredToken {
  token: string
  expiresAt: number
}

function readJson<T>(storage: Storage | undefined, key: string): T | null {
  try {
    const raw = storage?.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function safeStorage(kind: 'local' | 'session'): Storage | undefined {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return undefined
  }
}

export function loadSession(now = Date.now()): { auth: AuthState; workspace: WorkspaceState } {
  const session = readJson<StoredSession>(safeStorage('local'), SESSION_KEY)
  if (!session?.mode || !session.user) {
    return { auth: initialAuthState, workspace: initialWorkspaceState }
  }
  const workspace: WorkspaceState = {
    spreadsheetId: session.spreadsheetId ?? null,
    ownerEmail: session.ownerEmail ?? null,
  }
  if (session.mode === 'demo') {
    return {
      auth: { mode: 'demo', user: session.user, token: null, expiresAt: null, status: 'active' },
      workspace,
    }
  }
  const stored = readJson<StoredToken>(safeStorage('session'), TOKEN_KEY)
  const valid = !!stored && isTokenValid(stored, now)
  return {
    auth: {
      mode: 'google',
      user: session.user,
      token: valid ? stored.token : null,
      expiresAt: valid ? stored.expiresAt : null,
      status: valid ? 'active' : 'expired',
    },
    workspace,
  }
}

export function saveSession(auth: AuthState, workspace: WorkspaceState) {
  const local = safeStorage('local')
  const session = safeStorage('session')
  try {
    if (auth.status === 'signedOut' || !auth.mode || !auth.user) {
      local?.removeItem(SESSION_KEY)
      session?.removeItem(TOKEN_KEY)
      return
    }
    const stored: StoredSession = {
      mode: auth.mode,
      user: auth.user,
      spreadsheetId: workspace.spreadsheetId,
      ownerEmail: workspace.ownerEmail,
    }
    local?.setItem(SESSION_KEY, JSON.stringify(stored))
    if (auth.token && auth.expiresAt) {
      session?.setItem(TOKEN_KEY, JSON.stringify({ token: auth.token, expiresAt: auth.expiresAt }))
    } else {
      session?.removeItem(TOKEN_KEY)
    }
  } catch {
    // Storage full or blocked; the app keeps working for this page load.
  }
}
