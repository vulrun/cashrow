import { config } from '@/config/env'

export type ApiErrorKind =
  | 'auth' // token missing, expired or revoked
  | 'permission' // signed in, but no access to this file
  | 'notFound' // spreadsheet or tab is gone
  | 'notInitialized' // spreadsheet exists but has no __Settings tab
  | 'quota' // rate limited by Google
  | 'network' // offline / DNS / CORS
  | 'conflict' // row changed in the sheet since it was loaded
  | 'invalid' // Google rejected the request (400)
  | 'server' // Google 5xx
  | 'unknown'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status?: number
  readonly detail?: string

  constructor(kind: ApiErrorKind, opts: { status?: number; detail?: string; message?: string } = {}) {
    super(opts.message ?? defaultMessage(kind, opts.detail))
    this.name = 'ApiError'
    this.kind = kind
    this.status = opts.status
    this.detail = opts.detail
  }

  get retryable(): boolean {
    return this.kind === 'quota' || this.kind === 'server' || this.kind === 'network'
  }
}

function defaultMessage(kind: ApiErrorKind, detail?: string): string {
  switch (kind) {
    case 'auth':
      return 'Your Google session has expired. Continue with Google to pick up where you left off.'
    case 'permission':
      return "This Google account can't open that spreadsheet. It may belong to another account. Choose another spreadsheet or create a new one."
    case 'notFound':
      return "That spreadsheet or tab couldn't be found. It may have been deleted or renamed in Google Sheets."
    case 'notInitialized':
      return `This spreadsheet isn't set up for ${config.appName} yet.`
    case 'quota':
      return 'Google is limiting requests right now. Wait a minute, then try again.'
    case 'network':
      return "Can't reach Google. Check your internet connection and try again."
    case 'conflict':
      return 'This entry was changed in Google Sheets after you opened it. Reload the ledger and try again.'
    case 'invalid':
      return detail ? `Google Sheets rejected the change: ${detail}` : 'Google Sheets rejected the change.'
    case 'server':
      return 'Google Sheets is having trouble right now. Try again in a moment.'
    default:
      return detail ?? 'Something went wrong. Try again.'
  }
}

interface GoogleErrorBody {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: { reason?: string }[]
    details?: { reason?: string }[]
  }
}

/** Turns a failed Google API response into an ApiError. */
export async function errorFromResponse(res: Response): Promise<ApiError> {
  let body: GoogleErrorBody = {}
  try {
    body = (await res.json()) as GoogleErrorBody
  } catch {
    // Non-JSON error body; fall back to status code only.
  }
  const message = body.error?.message
  const reasons = [
    ...(body.error?.errors ?? []).map((e) => e.reason),
    ...(body.error?.details ?? []).map((d) => d.reason),
    body.error?.status,
  ]
    .filter(Boolean)
    .map((r) => String(r).toLowerCase())

  const isRate = reasons.some((r) => r.includes('ratelimit') || r.includes('resource_exhausted') || r.includes('quota'))
  const status = res.status

  if (status === 401) return new ApiError('auth', { status, detail: message })
  if (status === 429 || (status === 403 && isRate)) return new ApiError('quota', { status, detail: message })
  if (status === 403) return new ApiError('permission', { status, detail: message })
  if (status === 404) return new ApiError('notFound', { status, detail: message })
  if (status === 409) return new ApiError('conflict', { status, detail: message })
  if (status === 400) {
    // A range that names a missing tab comes back as 400 "Unable to parse range".
    if (message && /unable to parse range/i.test(message)) return new ApiError('notFound', { status, detail: message })
    return new ApiError('invalid', { status, detail: message })
  }
  if (status >= 500) return new ApiError('server', { status, detail: message })
  return new ApiError('unknown', { status, detail: message })
}

/** Normalises anything thrown into an ApiError so the UI has one shape to handle. */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err
  if (err instanceof TypeError) return new ApiError('network', { detail: err.message })
  if (err instanceof Error) return new ApiError('unknown', { detail: err.message, message: err.message })
  return new ApiError('unknown')
}

/** Human message for any error value (used by toasts and error states). */
export function errorMessage(err: unknown): string {
  if (!err) return ''
  if (err instanceof ApiError) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message
  }
  return toApiError(err).message
}
