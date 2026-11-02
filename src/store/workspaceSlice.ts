import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export interface WorkspaceState {
  /** The spreadsheet the app is working on. */
  spreadsheetId: string | null
  /** Email of the account that picked it, so a different account starts fresh. */
  ownerEmail: string | null
}

export const initialWorkspaceState: WorkspaceState = { spreadsheetId: null, ownerEmail: null }

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState: initialWorkspaceState,
  reducers: {
    workspaceSelected(_state, action: PayloadAction<{ spreadsheetId: string; ownerEmail: string }>) {
      return action.payload
    },
    workspaceCleared() {
      return initialWorkspaceState
    },
  },
})

export const { workspaceSelected, workspaceCleared } = workspaceSlice.actions
export default workspaceSlice.reducer
