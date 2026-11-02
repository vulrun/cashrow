import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureGoogleClient, googleRequest, retryConfig } from './http'
import { appendValues } from './sheetsApi'

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } })

const fetchMock = vi.fn()
const onUnauthorized = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  onUnauthorized.mockReset()
  retryConfig.sleep = () => Promise.resolve()
  configureGoogleClient({ getToken: () => 'token-123', onUnauthorized })
})

afterEach(() => vi.unstubAllGlobals())

describe('googleRequest', () => {
  it('sends the bearer token and parses JSON', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: 1 }))
    await expect(googleRequest('https://example.test/x', { query: { a: '1', r: ['p', 'q'] } })).resolves.toEqual({ ok: 1 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://example.test/x?a=1&r=p&r=q')
    expect(init.headers.Authorization).toBe('Bearer token-123')
  })

  it('retries rate limits and succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(json(429, { error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }))
      .mockResolvedValueOnce(json(403, { error: { code: 403, errors: [{ reason: 'userRateLimitExceeded' }] } }))
      .mockResolvedValueOnce(json(200, { done: true }))
    await expect(googleRequest('https://example.test/x')).resolves.toEqual({ done: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('gives up after the retry budget with a quota error', async () => {
    fetchMock.mockResolvedValue(json(429, { error: { code: 429 } }))
    await expect(googleRequest('https://example.test/x', { retries: 2 })).rejects.toMatchObject({ kind: 'quota' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('does not retry server errors for non-idempotent writes', async () => {
    fetchMock.mockResolvedValue(json(503, { error: { code: 503 } }))
    await expect(googleRequest('https://example.test/x', { method: 'POST', body: {} })).rejects.toMatchObject({ kind: 'server' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('flags expired sessions', async () => {
    fetchMock.mockResolvedValue(json(401, { error: { code: 401, message: 'Invalid Credentials' } }))
    await expect(googleRequest('https://example.test/x')).rejects.toMatchObject({ kind: 'auth' })
    expect(onUnauthorized).toHaveBeenCalled()
  })

  it('fails fast without a token', async () => {
    configureGoogleClient({ getToken: () => null, onUnauthorized })
    await expect(googleRequest('https://example.test/x')).rejects.toMatchObject({ kind: 'auth' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps permission, missing tab and network failures', async () => {
    fetchMock.mockResolvedValueOnce(json(403, { error: { code: 403, message: 'The caller does not have permission' } }))
    await expect(googleRequest('https://example.test/x')).rejects.toMatchObject({ kind: 'permission' })

    fetchMock.mockResolvedValueOnce(json(400, { error: { code: 400, message: 'Unable to parse range: Gone!A1' } }))
    await expect(googleRequest('https://example.test/x')).rejects.toMatchObject({ kind: 'notFound' })

    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(googleRequest('https://example.test/x', { retries: 1 })).rejects.toMatchObject({ kind: 'network' })
  })
})

describe('sheetsApi', () => {
  it('appends entries as RAW so notes are never run as formulas', async () => {
    fetchMock.mockResolvedValue(json(200, { updates: { updatedRange: "'A'!A6:H6" } }))
    await appendValues('sheet1', "'A'!A5:H5", [['=1+1']])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('valueInputOption=RAW')
    expect(url).toContain('insertDataOption=INSERT_ROWS')
    expect(init.method).toBe('POST')
  })
})
