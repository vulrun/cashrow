import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { routes } from '@/routes'
import { createStore } from '@/store'

function renderSignedOut(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <Provider store={createStore()}>
      <RouterProvider router={router} />
    </Provider>,
  )
  return router
}

describe('RequireAuth when signed out', () => {
  it('shows the landing page at /, with sign-in links to /login', async () => {
    const router = renderSignedOut('/')
    expect(await screen.findByRole('heading', { level: 1, name: /one row at a time/i })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
    for (const link of screen.getAllByRole('link', { name: /get started/i })) expect(link).toHaveAttribute('href', '/login')
  })

  it('sends other app pages to /login', async () => {
    const router = renderSignedOut('/parties/p1')
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
