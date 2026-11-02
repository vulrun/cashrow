import { describe, expect, it } from 'vitest'
import { isGoogleConfigured, readConfig } from './env'

describe('readConfig', () => {
  it('reads build-time VITE_* values', () => {
    const c = readConfig({}, { VITE_GOOGLE_CLIENT_ID: ' abc.apps.googleusercontent.com ', VITE_ROUTER_MODE: 'hash' })
    expect(c.googleClientId).toBe('abc.apps.googleusercontent.com')
    expect(c.routerMode).toBe('hash')
    expect(c.demoEnabled).toBe(true)
    expect(c.appName).toBe('Cashrow')
    expect(isGoogleConfigured(c)).toBe(true)
  })

  it('lets runtime config.js override build values', () => {
    const c = readConfig(
      { GOOGLE_CLIENT_ID: 'runtime-id', ENABLE_DEMO: 'false', APP_NAME: 'Acme Cash' },
      { VITE_GOOGLE_CLIENT_ID: 'build-id', VITE_ENABLE_DEMO: 'true' },
    )
    expect(c).toMatchObject({ googleClientId: 'runtime-id', demoEnabled: false, appName: 'Acme Cash' })
  })

  it('ignores empty runtime values', () => {
    expect(readConfig({ GOOGLE_CLIENT_ID: '' }, { VITE_GOOGLE_CLIENT_ID: 'build-id' }).googleClientId).toBe('build-id')
  })

  it('treats a missing client id as not configured', () => {
    expect(isGoogleConfigured(readConfig({}, {}))).toBe(false)
  })
})
