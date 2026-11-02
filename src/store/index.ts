import { combineReducers, configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { useDispatch, useSelector } from 'react-redux'
import { configureGoogleClient } from '@/google/http'
import { api } from './api'
import authReducer, { isTokenValid, sessionExpired } from './authSlice'
import { loadSession, saveSession } from './session'
import workspaceReducer from './workspaceSlice'

const rootReducer = combineReducers({
  auth: authReducer,
  workspace: workspaceReducer,
  [api.reducerPath]: api.reducer,
})

export type RootState = ReturnType<typeof rootReducer>

export function createStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as RootState | undefined,
    middleware: (getDefault) => getDefault().concat(api.middleware),
  })
}

export type AppStore = ReturnType<typeof createStore>
export type AppDispatch = AppStore['dispatch']

export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()

/** The app's store: restores the saved session and keeps it in sync. */
export function createAppStore(): AppStore {
  const store = createStore(loadSession())

  configureGoogleClient({
    getToken: () => {
      const { auth } = store.getState()
      return auth.mode === 'google' && isTokenValid(auth) ? auth.token : null
    },
    onUnauthorized: () => store.dispatch(sessionExpired()),
  })

  let last = ''
  store.subscribe(() => {
    const { auth, workspace } = store.getState()
    const key = JSON.stringify([auth.mode, auth.user, auth.token, auth.expiresAt, auth.status, workspace])
    if (key === last) return
    last = key
    saveSession(auth, workspace)
  })

  setupListeners(store.dispatch)
  return store
}
