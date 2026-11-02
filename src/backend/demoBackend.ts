import { addDays, todayIso, nowStamp } from '@/lib/dates'
import { newId } from '@/lib/utils'
import { DEFAULT_SETTINGS, parseGlobalSettings } from '@/domain/schemas'
import {
  pickPartyInput,
  type Entry,
  type EntryInput,
  type GlobalSettings,
  type Party,
  type PartyInput,
  type SpreadsheetRef,
  type Workspace,
} from '@/domain/types'
import { ApiError } from '@/google/errors'
import { DEMO_PARTIES, SEED_ANCHOR } from './demoSeed'
import { PARTY_TAB, REGISTRY } from './layout'
import type { Backend, LedgerData } from './types'

/**
 * Browser-only backend with sample data. Lets anyone try the app (or develop
 * the UI) without a Google Cloud project. Data lives in localStorage.
 */

export const DEMO_SPREADSHEET_ID = 'demo'
const STORAGE_KEY = 'cashrow.demo.v1'

interface DemoState {
  workspace: Workspace
  ledgers: Record<string, Entry[]>
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000)
}

export function buildDemoState(today = todayIso()): DemoState {
  const shift = daysBetween(SEED_ANCHOR, addDays(today, -1))
  const parties: Party[] = []
  const ledgers: Record<string, Entry[]> = {}

  DEMO_PARTIES.forEach((seed, index) => {
    const entries = seed.entries.map(([date, type, amount, method, notes], i): Entry => {
      const shifted = addDays(date, shift)
      const stamp = `${shifted}T10:00:00.000Z`
      return {
        id: `ent_demo${index}x${i}`,
        date: shifted,
        type,
        amount,
        method,
        notes,
        createdAt: stamp,
        updatedAt: stamp,
        row: PARTY_TAB.firstDataRow + i,
      }
    })
    const first = entries[0]?.date ?? today
    const id = `pty_demo${index}`
    parties.push({
      id,
      sheetId: 1000 + index,
      name: seed.name,
      status: seed.status,
      createdAt: `${first}T09:00:00.000Z`,
      archivedAt: seed.status === 'archived' ? `${addDays(entries.at(-1)?.date ?? today, 14)}T09:00:00.000Z` : null,
      phone: seed.phone ?? '',
      email: '',
      defaultMethod: 'UPI',
      notes: '',
      outLabel: '',
      inLabel: '',
      registryRow: REGISTRY.firstRow + index,
    })
    ledgers[id] = entries
  })

  return {
    workspace: {
      spreadsheetId: DEMO_SPREADSHEET_ID,
      title: 'Demo cash book',
      url: '',
      settings: { ...DEFAULT_SETTINGS },
      settingsSheetId: 0,
      parties,
      tabCount: parties.length + 1,
    },
    ledgers,
  }
}

export function resetDemoData() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable (private mode); nothing to reset.
  }
}

export class DemoBackend implements Backend {
  readonly kind = 'demo' as const
  private memory: DemoState | null = null
  private readonly latencyMs: number

  constructor(opts: { latencyMs?: number } = {}) {
    this.latencyMs = opts.latencyMs ?? 180
  }

  private read(): DemoState {
    if (this.memory) return this.memory
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState
        parsed.workspace.settings = parseGlobalSettings(parsed.workspace.settings)
        // Demo data saved before per-party labels existed.
        parsed.workspace.parties = parsed.workspace.parties.map((p) => ({ ...p, outLabel: p.outLabel ?? '', inLabel: p.inLabel ?? '' }))
        this.memory = parsed
        return parsed
      }
    } catch {
      // Corrupt or unavailable storage: start over from the seed.
    }
    this.memory = buildDemoState()
    this.write(this.memory)
    return this.memory
  }

  private write(state: DemoState) {
    this.memory = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Keep working in memory if storage is full or blocked.
    }
  }

  private wait() {
    return new Promise<void>((resolve) => setTimeout(resolve, this.latencyMs))
  }

  private clone<T>(value: T): T {
    return structuredClone(value)
  }

  async listSpreadsheets(): Promise<SpreadsheetRef[]> {
    await this.wait()
    const ws = this.read().workspace
    return [{ id: ws.spreadsheetId, name: ws.title, url: '' }]
  }

  async createSpreadsheet(): Promise<SpreadsheetRef> {
    throw new ApiError('invalid', { message: 'Demo mode uses one built-in cash book.' })
  }

  async initializeSpreadsheet(): Promise<void> {}

  async loadWorkspace(spreadsheetId: string): Promise<Workspace> {
    await this.wait()
    if (spreadsheetId !== DEMO_SPREADSHEET_ID) throw new ApiError('notFound')
    return this.clone(this.read().workspace)
  }

  async loadLedgers(ws: Workspace): Promise<LedgerData> {
    await this.wait()
    const state = this.read()
    const byParty: LedgerData['byParty'] = {}
    for (const p of ws.parties) byParty[p.id] = this.clone(state.ledgers[p.id] ?? [])
    return { byParty, skippedRows: {} }
  }

  async addParty(_ws: Workspace, input: PartyInput): Promise<Party> {
    await this.wait()
    const state = this.read()
    const party: Party = {
      id: newId('pty'),
      sheetId: Math.max(1000, ...state.workspace.parties.map((p) => p.sheetId)) + 1,
      name: input.name,
      status: 'active',
      createdAt: nowStamp(),
      archivedAt: null,
      phone: input.phone,
      email: input.email,
      defaultMethod: input.defaultMethod || state.workspace.settings.paymentMethods[0],
      notes: input.notes,
      outLabel: input.outLabel,
      inLabel: input.inLabel,
      registryRow: REGISTRY.firstRow + state.workspace.parties.length,
    }
    state.workspace.parties.push(party)
    state.workspace.tabCount += 1
    state.ledgers[party.id] = []
    this.write(state)
    return this.clone(party)
  }

  async updateParty(_ws: Workspace, party: Party, input: PartyInput): Promise<Party> {
    await this.wait()
    return this.patchParty(party.id, pickPartyInput(input))
  }

  async setPartyArchived(_ws: Workspace, party: Party, archived: boolean): Promise<Party> {
    await this.wait()
    return this.patchParty(party.id, {
      status: archived ? 'archived' : 'active',
      archivedAt: archived ? nowStamp() : null,
    })
  }

  private patchParty(id: string, patch: Partial<Party>): Party {
    const state = this.read()
    const index = state.workspace.parties.findIndex((p) => p.id === id)
    if (index < 0) throw new ApiError('notFound')
    const next = { ...state.workspace.parties[index], ...patch }
    state.workspace.parties[index] = next
    this.write(state)
    return this.clone(next)
  }

  async addEntry(_ws: Workspace, party: Party, input: EntryInput): Promise<Entry> {
    await this.wait()
    const state = this.read()
    const list = state.ledgers[party.id] ?? (state.ledgers[party.id] = [])
    const lastRow = list.reduce((max, e) => Math.max(max, e.row), PARTY_TAB.firstDataRow - 1)
    const now = nowStamp()
    const entry: Entry = { id: newId('ent'), ...input, createdAt: now, updatedAt: now, row: lastRow + 1 }
    list.push(entry)
    this.write(state)
    return this.clone(entry)
  }

  async updateEntry(_ws: Workspace, party: Party, entry: Entry, input: EntryInput): Promise<Entry> {
    await this.wait()
    const state = this.read()
    const list = state.ledgers[party.id] ?? []
    const index = list.findIndex((e) => e.id === entry.id)
    if (index < 0) throw new ApiError('conflict')
    const next: Entry = { ...list[index], ...input, updatedAt: nowStamp() }
    list[index] = next
    this.write(state)
    return this.clone(next)
  }

  async saveSettings(_ws: Workspace, settings: GlobalSettings): Promise<GlobalSettings> {
    await this.wait()
    const state = this.read()
    state.workspace.settings = settings
    this.write(state)
    return settings
  }
}
