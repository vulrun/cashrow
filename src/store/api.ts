import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import type { ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import { getBackend, type Backend, type LedgerData } from '@/backend'
import type { Entry, EntryInput, GlobalSettings, Party, PartyInput, SpreadsheetRef, Workspace } from '@/domain/types'
import { ApiError, toApiError, type ApiErrorKind } from '@/google/errors'
import { sessionExpired, type AuthState } from './authSlice'

/** Plain-object error stored in Redux (class instances are not serializable). */
export interface AppError {
  kind: ApiErrorKind
  message: string
  status?: number
}

type StateWithAuth = { auth: AuthState }
type Dispatch = ThunkDispatch<unknown, unknown, UnknownAction>

function backendFrom(getState: () => unknown): Backend {
  const mode = (getState() as StateWithAuth).auth.mode
  return getBackend(mode === 'demo' ? 'demo' : 'google')
}

async function run<T>(dispatch: Dispatch, fn: () => Promise<T>): Promise<{ data: T } | { error: AppError }> {
  try {
    return { data: await fn() }
  } catch (err) {
    const e = toApiError(err)
    if (e.kind === 'auth') dispatch(sessionExpired())
    return { error: { kind: e.kind, message: e.message, status: e.status } }
  }
}

export interface PartyArgs {
  spreadsheetId: string
  partyId: string
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fakeBaseQuery<AppError>(),
  tagTypes: ['Spreadsheets', 'Workspace', 'Ledgers'],
  // Pick up edits made directly in Google Sheets when the user returns to the tab.
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (build) => {
    /** Current workspace from cache, loading it if needed. */
    async function workspaceFor(spreadsheetId: string, getState: () => unknown, dispatch: Dispatch): Promise<Workspace> {
      const cached = api.endpoints.getWorkspace.select(spreadsheetId)(getState() as never).data
      if (cached) return cached
      const sub = dispatch(api.endpoints.getWorkspace.initiate(spreadsheetId))
      try {
        return await sub.unwrap()
      } catch (err) {
        const e = err as Partial<AppError>
        throw new ApiError(e.kind ?? 'unknown', { message: e.message, status: e.status })
      } finally {
        sub.unsubscribe()
      }
    }

    async function partyFor(args: PartyArgs, getState: () => unknown, dispatch: Dispatch) {
      const ws = await workspaceFor(args.spreadsheetId, getState, dispatch)
      const party = ws.parties.find((p) => p.id === args.partyId)
      if (!party) throw new ApiError('notFound', { message: 'That party no longer exists. Reload and try again.' })
      return { ws, party }
    }

    return {
      listSpreadsheets: build.query<SpreadsheetRef[], void>({
        queryFn: (_arg, { getState, dispatch }) => run(dispatch, () => backendFrom(getState).listSpreadsheets()),
        providesTags: ['Spreadsheets'],
      }),

      createSpreadsheet: build.mutation<SpreadsheetRef, { title: string }>({
        queryFn: ({ title }, { getState, dispatch }) =>
          run(dispatch, () => backendFrom(getState).createSpreadsheet(title)),
        invalidatesTags: ['Spreadsheets'],
      }),

      initializeSpreadsheet: build.mutation<void, { spreadsheetId: string }>({
        queryFn: ({ spreadsheetId }, { getState, dispatch }) =>
          run(dispatch, () => backendFrom(getState).initializeSpreadsheet(spreadsheetId)),
        invalidatesTags: (_r, _e, { spreadsheetId }) => [{ type: 'Workspace', id: spreadsheetId }, 'Spreadsheets'],
      }),

      getWorkspace: build.query<Workspace, string>({
        queryFn: (spreadsheetId, { getState, dispatch }) =>
          run(dispatch, () => backendFrom(getState).loadWorkspace(spreadsheetId)),
        providesTags: (_r, _e, id) => [{ type: 'Workspace', id }],
      }),

      getLedgers: build.query<LedgerData, string>({
        queryFn: (spreadsheetId, { getState, dispatch }) =>
          run(dispatch, async () => {
            const ws = await workspaceFor(spreadsheetId, getState, dispatch)
            return backendFrom(getState).loadLedgers(ws)
          }),
        providesTags: (_r, _e, id) => [{ type: 'Ledgers', id }],
      }),

      addParty: build.mutation<Party, { spreadsheetId: string; input: PartyInput }>({
        queryFn: ({ spreadsheetId, input }, { getState, dispatch }) =>
          run(dispatch, async () => {
            const ws = await workspaceFor(spreadsheetId, getState, dispatch)
            return backendFrom(getState).addParty(ws, input)
          }),
        async onQueryStarted({ spreadsheetId }, { dispatch, queryFulfilled }) {
          try {
            const { data: party } = await queryFulfilled
            dispatch(
              api.util.updateQueryData('getWorkspace', spreadsheetId, (ws) => {
                ws.parties.push(party)
                ws.tabCount += 1
              }),
            )
            dispatch(
              api.util.updateQueryData('getLedgers', spreadsheetId, (data) => {
                data.byParty[party.id] = []
              }),
            )
          } catch {
            // Error surfaces through the mutation result.
          }
        },
        invalidatesTags: (_r, _e, { spreadsheetId }) => [{ type: 'Workspace', id: spreadsheetId }],
      }),

      updateParty: build.mutation<Party, PartyArgs & { input: PartyInput }>({
        queryFn: (args, { getState, dispatch }) =>
          run(dispatch, async () => {
            const { ws, party } = await partyFor(args, getState, dispatch)
            return backendFrom(getState).updateParty(ws, party, args.input)
          }),
        async onQueryStarted({ spreadsheetId }, { dispatch, queryFulfilled }) {
          try {
            const { data: party } = await queryFulfilled
            dispatch(replaceParty(spreadsheetId, party))
          } catch {
            // handled by caller
          }
        },
        invalidatesTags: (_r, _e, { spreadsheetId }) => [{ type: 'Workspace', id: spreadsheetId }],
      }),

      setPartyArchived: build.mutation<Party, PartyArgs & { archived: boolean }>({
        queryFn: (args, { getState, dispatch }) =>
          run(dispatch, async () => {
            const { ws, party } = await partyFor(args, getState, dispatch)
            return backendFrom(getState).setPartyArchived(ws, party, args.archived)
          }),
        async onQueryStarted({ spreadsheetId }, { dispatch, queryFulfilled }) {
          try {
            const { data: party } = await queryFulfilled
            dispatch(replaceParty(spreadsheetId, party))
          } catch {
            // handled by caller
          }
        },
        invalidatesTags: (_r, _e, { spreadsheetId }) => [{ type: 'Workspace', id: spreadsheetId }],
      }),

      addEntry: build.mutation<Entry, PartyArgs & { input: EntryInput }>({
        queryFn: (args, { getState, dispatch }) =>
          run(dispatch, async () => {
            const { ws, party } = await partyFor(args, getState, dispatch)
            return backendFrom(getState).addEntry(ws, party, args.input)
          }),
        async onQueryStarted({ spreadsheetId, partyId }, { dispatch, queryFulfilled }) {
          try {
            const { data: entry } = await queryFulfilled
            dispatch(
              api.util.updateQueryData('getLedgers', spreadsheetId, (data) => {
                ;(data.byParty[partyId] ??= []).push(entry)
              }),
            )
          } catch {
            // handled by caller
          }
        },
      }),

      updateEntry: build.mutation<Entry, PartyArgs & { entry: Entry; input: EntryInput }>({
        queryFn: (args, { getState, dispatch }) =>
          run(dispatch, async () => {
            const { ws, party } = await partyFor(args, getState, dispatch)
            return backendFrom(getState).updateEntry(ws, party, args.entry, args.input)
          }),
        async onQueryStarted({ spreadsheetId, partyId, entry: original }, { dispatch, queryFulfilled }) {
          try {
            const { data: entry } = await queryFulfilled
            dispatch(
              api.util.updateQueryData('getLedgers', spreadsheetId, (data) => {
                const list = data.byParty[partyId] ?? []
                const i = list.findIndex((e) => e.id === original.id)
                if (i >= 0) list[i] = entry
              }),
            )
          } catch (err) {
            // Someone changed the sheet underneath us: reload so the user sees the truth.
            const kind = (err as { error?: AppError }).error?.kind
            if (kind === 'conflict' || kind === 'notFound') {
              dispatch(api.util.invalidateTags([{ type: 'Ledgers', id: spreadsheetId }]))
            }
          }
        },
      }),

      saveSettings: build.mutation<GlobalSettings, { spreadsheetId: string; settings: GlobalSettings }>({
        queryFn: ({ spreadsheetId, settings }, { getState, dispatch }) =>
          run(dispatch, async () => {
            const ws = await workspaceFor(spreadsheetId, getState, dispatch)
            return backendFrom(getState).saveSettings(ws, settings)
          }),
        async onQueryStarted({ spreadsheetId }, { dispatch, queryFulfilled }) {
          try {
            const { data: settings } = await queryFulfilled
            dispatch(
              api.util.updateQueryData('getWorkspace', spreadsheetId, (ws) => {
                ws.settings = settings
              }),
            )
          } catch {
            // handled by caller
          }
        },
      }),
    }
  },
})

function replaceParty(spreadsheetId: string, party: Party) {
  return api.util.updateQueryData('getWorkspace', spreadsheetId, (ws) => {
    const i = ws.parties.findIndex((p) => p.id === party.id)
    if (i >= 0) ws.parties[i] = party
  })
}

export const {
  useListSpreadsheetsQuery,
  useCreateSpreadsheetMutation,
  useInitializeSpreadsheetMutation,
  useGetWorkspaceQuery,
  useGetLedgersQuery,
  useAddPartyMutation,
  useUpdatePartyMutation,
  useSetPartyArchivedMutation,
  useAddEntryMutation,
  useUpdateEntryMutation,
  useSaveSettingsMutation,
} = api
