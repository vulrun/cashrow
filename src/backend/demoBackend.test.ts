import { describe, expect, it } from 'vitest'
import { DemoBackend, buildDemoState } from './demoBackend'

describe('DemoBackend', () => {
  it('shifts sample dates so the newest entry is yesterday', () => {
    const state = buildDemoState('2027-03-10')
    const latest = Object.values(state.ledgers)
      .flat()
      .reduce((max, e) => (e.date > max ? e.date : max), '')
    expect(latest).toBe('2027-03-09')
    expect(state.workspace.parties.filter((p) => p.status === 'archived')).toHaveLength(2)
  })

  it('adds entries at the next row and keeps them across instances', async () => {
    const backend = new DemoBackend({ latencyMs: 0 })
    const ws = await backend.loadWorkspace('demo')
    const party = ws.parties[0]
    const before = (await backend.loadLedgers(ws)).byParty[party.id]
    const added = await backend.addEntry(ws, party, { date: '2026-11-01', type: 'OUT', amount: 10, method: 'UPI', notes: '' })
    expect(added.row).toBe(Math.max(...before.map((e) => e.row)) + 1)

    const again = new DemoBackend({ latencyMs: 0 })
    const ledgers = await again.loadLedgers(await again.loadWorkspace('demo'))
    expect(ledgers.byParty[party.id].some((e) => e.id === added.id)).toBe(true)
  })

  it('archives and renames parties', async () => {
    const backend = new DemoBackend({ latencyMs: 0 })
    const ws = await backend.loadWorkspace('demo')
    const party = ws.parties[1]
    expect((await backend.setPartyArchived(ws, party, true)).status).toBe('archived')
    const renamed = await backend.updateParty(ws, party, { ...party, name: 'New name' })
    expect(renamed.name).toBe('New name')
    expect((await backend.loadWorkspace('demo')).parties[1]).toMatchObject({ name: 'New name', status: 'archived' })
  })
})
