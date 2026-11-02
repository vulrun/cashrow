import { DemoBackend } from './demoBackend'
import { SheetsBackend } from './sheetsBackend'
import type { Backend } from './types'

export type { Backend, LedgerData } from './types'
export { DEMO_SPREADSHEET_ID, resetDemoData } from './demoBackend'

let sheetsBackend: Backend | null = null
let demoBackend: Backend | null = null

export function getBackend(mode: 'google' | 'demo'): Backend {
  if (mode === 'demo') return (demoBackend ??= new DemoBackend())
  return (sheetsBackend ??= new SheetsBackend())
}

/** Test hook: swap in a fake backend. */
export function setBackendForTesting(mode: 'google' | 'demo', backend: Backend | null) {
  if (mode === 'demo') demoBackend = backend
  else sheetsBackend = backend
}
