import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/LoginPage'
import { RequireAuth, RequireWorkspace } from '@/features/auth/RequireAuth'
import { NotFoundPage, RouteError } from '@/features/common/RouteError'
import { AppLayout } from '@/features/layout/AppLayout'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { PartyPage } from '@/features/party/PartyPage'
import { SetupPage } from '@/features/setup/SetupPage'

/**
 * /login               sign in, or try the demo
 * /setup               create or pick a spreadsheet
 * /                    overview (all parties)
 * /parties/:partyId    one party's ledger
 */
export const routes: RouteObject[] = [
  {
    errorElement: <RouteError />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: '/setup', element: <SetupPage /> },
          {
            element: <RequireWorkspace />,
            children: [
              {
                element: <AppLayout />,
                children: [
                  { index: true, element: <OverviewPage /> },
                  { path: 'parties/:partyId', element: <PartyPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
