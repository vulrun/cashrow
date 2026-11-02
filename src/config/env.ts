/**
 * App configuration.
 *
 * Values come from two places, in priority order:
 *   1. window.__CASHROW_CONFIG__ (public/config.js; the Docker image writes it at start-up)
 *   2. VITE_* variables baked in at build time (.env.local, Vercel/Netlify settings, CI vars)
 *
 * Everything here ends up in the browser, so nothing here may be secret.
 */

type RuntimeConfig = Partial<{
  GOOGLE_CLIENT_ID: string
  ENABLE_DEMO: string
  APP_NAME: string
}>

declare global {
  interface Window {
    __CASHROW_CONFIG__?: RuntimeConfig
  }
}

export interface AppConfig {
  /** OAuth 2.0 web client ID. Empty means Google sign-in is not configured. */
  googleClientId: string
  /** Whether "Try the demo" is offered. */
  demoEnabled: boolean
  /** "browser" for clean URLs (needs SPA fallback) or "hash" for any static host. */
  routerMode: 'browser' | 'hash'
  appName: string
}

export const DEFAULT_APP_NAME = 'Cashrow'

function pick(runtime: string | undefined, build: string | undefined): string {
  const value = runtime !== undefined && runtime !== '' ? runtime : build
  return (value ?? '').trim()
}

function toBool(value: string, fallback: boolean): boolean {
  if (value === '') return fallback
  return !['false', '0', 'no', 'off'].includes(value.toLowerCase())
}

export function readConfig(
  runtime: RuntimeConfig = (typeof window !== 'undefined' && window.__CASHROW_CONFIG__) || {},
  build: Record<string, string | undefined> = import.meta.env as unknown as Record<string, string | undefined>,
): AppConfig {
  const routerMode = pick(undefined, build.VITE_ROUTER_MODE) === 'hash' ? 'hash' : 'browser'
  return {
    googleClientId: pick(runtime.GOOGLE_CLIENT_ID, build.VITE_GOOGLE_CLIENT_ID),
    demoEnabled: toBool(pick(runtime.ENABLE_DEMO, build.VITE_ENABLE_DEMO), true),
    routerMode,
    appName: pick(runtime.APP_NAME, build.VITE_APP_NAME) || DEFAULT_APP_NAME,
  }
}

export const config: AppConfig = readConfig()

export const isGoogleConfigured = (c: AppConfig = config) => c.googleClientId.length > 0
