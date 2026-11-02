import { createBrowserRouter, createHashRouter, RouterProvider } from 'react-router'
import { config } from '@/config/env'
import { routes } from './routes'

// "hash" works on hosts without an SPA fallback (GitHub Pages).
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined
const router = config.routerMode === 'hash' ? createHashRouter(routes) : createBrowserRouter(routes, { basename })

export default function App() {
  return <RouterProvider router={router} />
}
