import { ApiError, errorFromResponse } from './errors'

/**
 * Small fetch wrapper for Google REST APIs.
 *  - Adds the OAuth access token.
 *  - Retries rate limits (429/403 rate) and 5xx with exponential backoff + jitter,
 *    honouring Retry-After when Google sends it.
 *  - Converts failures into ApiError.
 */

export interface GoogleClientHooks {
  /** Returns a valid access token, or null when the session has expired. */
  getToken: () => string | null
  /** Called when Google answers 401 or no token is available. */
  onUnauthorized?: () => void
}

let hooks: GoogleClientHooks = { getToken: () => null }

export function configureGoogleClient(next: GoogleClientHooks) {
  hooks = next
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | string[] | undefined>
  body?: unknown
  /** Max retries after the first attempt. */
  retries?: number
  /**
   * Whether repeating the request is harmless. Defaults to true for GET and PUT.
   * Non-idempotent requests (append, batchUpdate) are only retried on rate limits,
   * where Google guarantees nothing was written.
   */
  idempotent?: boolean
  signal?: AbortSignal
}

export const retryConfig = {
  baseDelayMs: 600,
  maxDelayMs: 8_000,
  sleep: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
}

export function buildUrl(base: string, query?: RequestOptions['query']): string {
  if (!query) return base
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v))
    else params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base
}

export async function googleRequest<T>(url: string, opts: RequestOptions = {}): Promise<T> {
  const retries = opts.retries ?? 3
  const method = opts.method ?? 'GET'
  const idempotent = opts.idempotent ?? (method === 'GET' || method === 'PUT')
  let attempt = 0

  for (;;) {
    const token = hooks.getToken()
    if (!token) {
      hooks.onUnauthorized?.()
      throw new ApiError('auth')
    }

    let res: Response
    try {
      res = await fetch(buildUrl(url, opts.query), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: opts.signal,
      })
    } catch (err) {
      if (opts.signal?.aborted) throw err
      if (idempotent && attempt < retries) {
        await retryConfig.sleep(backoff(attempt))
        attempt++
        continue
      }
      throw new ApiError('network', { detail: err instanceof Error ? err.message : undefined })
    }

    if (res.ok) {
      if (res.status === 204) return undefined as T
      const text = await res.text()
      return (text ? JSON.parse(text) : undefined) as T
    }

    const error = await errorFromResponse(res)
    if (error.kind === 'auth') hooks.onUnauthorized?.()
    const canRetry = error.kind === 'quota' || (error.kind === 'server' && idempotent)
    if (canRetry && attempt < retries) {
      await retryConfig.sleep(retryAfterMs(res) ?? backoff(attempt))
      attempt++
      continue
    }
    throw error
  }
}

function backoff(attempt: number): number {
  const exp = Math.min(retryConfig.maxDelayMs, retryConfig.baseDelayMs * 2 ** attempt)
  return exp / 2 + Math.random() * (exp / 2)
}

function retryAfterMs(res: Response): number | null {
  const header = res.headers.get('Retry-After')
  if (!header) return null
  const seconds = Number(header)
  if (Number.isFinite(seconds)) return Math.min(retryConfig.maxDelayMs, seconds * 1000)
  return null
}
