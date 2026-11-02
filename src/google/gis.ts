import { config } from '@/config/env'
import { loadScript } from './scripts'

/**
 * Google Identity Services (GIS) token model.
 * Docs: https://developers.google.com/identity/oauth2/web/guides/use-token-model
 *
 * The browser gets a short-lived access token (about one hour) directly from Google.
 * There is no backend and no refresh token; when the token runs out the user clicks
 * "Continue with Google" and GIS issues a new one without asking for consent again.
 */

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  // Non-sensitive: access only to files this app creates or the user opens with it.
  'https://www.googleapis.com/auth/drive.file',
] as const

export const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file'

const GIS_SRC = 'https://accounts.google.com/gsi/client'

interface TokenResponse {
  access_token?: string
  expires_in?: number | string
  scope?: string
  error?: string
  error_description?: string
}

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (res: TokenResponse) => void
  error_callback?: (err: { type?: string; message?: string }) => void
  prompt?: '' | 'none' | 'consent' | 'select_account'
  hint?: string
  include_granted_scopes?: boolean
}

interface GoogleOAuth2 {
  initTokenClient(config: TokenClientConfig): { requestAccessToken(override?: Partial<TokenClientConfig>): void }
  revoke(token: string, done?: () => void): void
  hasGrantedAllScopes(res: TokenResponse, ...scopes: string[]): boolean
}

declare global {
  interface Window {
    google?: { accounts?: { oauth2?: GoogleOAuth2 } }
  }
}

export interface AccessToken {
  token: string
  /** Epoch milliseconds. */
  expiresAt: number
}

export interface GoogleUser {
  email: string
  name: string
  picture?: string
}

export class SignInError extends Error {
  readonly code: 'popup_closed' | 'popup_blocked' | 'access_denied' | 'missing_scope' | 'script' | 'unknown'
  constructor(code: SignInError['code'], message: string) {
    super(message)
    this.name = 'SignInError'
    this.code = code
  }
}

async function oauth2(): Promise<GoogleOAuth2> {
  try {
    await loadScript(GIS_SRC)
  } catch {
    throw new SignInError('script', "Google sign-in couldn't load. Check your connection or disable blockers for this site.")
  }
  const api = window.google?.accounts?.oauth2
  if (!api) throw new SignInError('script', "Google sign-in couldn't start. Reload the page and try again.")
  return api
}

/**
 * Opens Google's popup and resolves with an access token.
 * Must be called from a click handler, or browsers block the popup.
 */
export async function requestAccessToken(opts: {
  clientId: string
  prompt?: TokenClientConfig['prompt']
  hint?: string
}): Promise<AccessToken> {
  const api = await oauth2()
  return new Promise<AccessToken>((resolve, reject) => {
    const client = api.initTokenClient({
      client_id: opts.clientId,
      scope: GOOGLE_SCOPES.join(' '),
      prompt: opts.prompt ?? '',
      hint: opts.hint,
      include_granted_scopes: true,
      callback: (res) => {
        if (res.error || !res.access_token) {
          reject(
            new SignInError(
              res.error === 'access_denied' ? 'access_denied' : 'unknown',
              res.error === 'access_denied'
                ? 'Google sign-in was cancelled.'
                : (res.error_description ?? 'Google sign-in failed. Try again.'),
            ),
          )
          return
        }
        if (!api.hasGrantedAllScopes(res, DRIVE_FILE_SCOPE)) {
          reject(
            new SignInError(
              'missing_scope',
              `${config.appName} needs permission to create and edit its own spreadsheets in your Google Drive. Sign in again and keep that box ticked.`,
            ),
          )
          return
        }
        const seconds = Number(res.expires_in ?? 3600)
        resolve({ token: res.access_token, expiresAt: Date.now() + seconds * 1000 })
      },
      error_callback: (err) => {
        if (err.type === 'popup_closed') reject(new SignInError('popup_closed', 'The Google window was closed before sign-in finished.'))
        else if (err.type === 'popup_failed_to_open')
          reject(new SignInError('popup_blocked', 'Your browser blocked the Google sign-in window. Allow pop-ups for this site and try again.'))
        else reject(new SignInError('unknown', err.message ?? 'Google sign-in failed. Try again.'))
      },
    })
    client.requestAccessToken()
  })
}

export async function fetchGoogleUser(token: string): Promise<GoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new SignInError('unknown', "Couldn't read your Google profile. Try signing in again.")
  const body = (await res.json()) as { email?: string; name?: string; picture?: string }
  return { email: body.email ?? '', name: body.name ?? body.email ?? 'Google user', picture: body.picture }
}

/** Revokes the token so the app loses access until the next sign-in. Best effort. */
export async function revokeAccessToken(token: string): Promise<void> {
  try {
    const api = await oauth2()
    await new Promise<void>((resolve) => api.revoke(token, () => resolve()))
  } catch {
    // Ignore: signing out locally still works.
  }
}
