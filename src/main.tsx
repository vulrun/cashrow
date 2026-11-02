import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { Toaster } from '@/components/ui/toaster'
import { config } from '@/config/env'
import { createAppStore } from '@/store'
import App from './App'
import './index.css'

document.title = config.appName
const store = createAppStore()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <Toaster />
    </Provider>
  </StrictMode>,
)
