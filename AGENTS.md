# AGENTS.md

Guide for AI coding agents (and humans) working in this repository. Read this before changing code.

## What this is

Cashrow is a **frontend-only** React app. Each user signs in with Google and the app stores
everything in a Google Sheet in **their own Drive**: one tab per party (customer or supplier), one
`__Settings` tab for app settings and the party list. There is no server, database or API of our own.
Anyone can fork the repo and deploy it to a static host with their own Google OAuth client ID.

## Commands

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Dev server (http://localhost:5173) | `npm run dev` |
| Lint (oxlint) | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests (Vitest + jsdom) | `npm test` |
| All checks (what CI runs, minus build) | `npm run check` |
| Production build to `dist/` | `npm run build` |

Node 20.19+ (see `.nvmrc`). Without `VITE_GOOGLE_CLIENT_ID` the app still runs: use **Try the demo**,
which keeps sample data in `localStorage`. Use demo mode for all UI work.

## Stack

Vite 8 · React 19 · TypeScript 7 (strict) · Tailwind CSS 4 · shadcn-style components on Radix
(`radix-ui`) · Redux Toolkit + RTK Query · React Router 8 · sonner (toasts) · lucide-react (icons) ·
Vitest + Testing Library. No form or date libraries: validation and date math are small local modules.

## Map

```
src/
  config/env.ts            runtime config (window.__CASHROW_CONFIG__) over build-time VITE_* vars
  config/project.ts        repo URL used for in-app doc links
  lib/                     dates (ISO strings, UTC math), money (format/parse), utils, a11y
  domain/                  types, validation (schemas.ts), ledger math (totals, filters, presets)
  google/                  REST clients: http (auth, retry, errors), sheetsApi, driveApi, gis (OAuth)
  backend/                 storage behind one interface
    types.ts               Backend interface: the only way UI code touches data
    layout.ts              where things live in the spreadsheet (rows, columns, formulas)
    mappers.ts             sheet rows <-> domain objects
    sheetsBackend.ts       Google Sheets implementation
    demoBackend.ts         localStorage implementation + demoSeed.ts sample data
  store/                   Redux store: authSlice, workspaceSlice, session persistence, api.ts (RTK Query)
  features/                screens and feature components (auth, setup, layout, overview, party, parties, settings)
  components/ui/           primitives: button, dialog, sheet, select, popover, calendar, date pickers...
  components/brand/        Logo, CashrowMark, AppTile, Wordmark (the brand mark drawn as inline SVG)
  routes.tsx               route table
docs/                      architecture, data model, Google Cloud setup, deployment, security
brand/                     logo kit: SVG/PNG logos, app icons, colour tokens, brand-guide.html
```

## Rules that keep the app correct

1. **UI never calls Google directly.** Screens use RTK Query hooks from `store/api.ts`, which call a
   `Backend`. New data needs a new `Backend` method implemented in **both** `sheetsBackend.ts` and
   `demoBackend.ts`, plus an endpoint in `api.ts`. The only exception is Google's own sign-in popup
   (`features/auth/authActions.ts`).
2. **The spreadsheet layout is a public contract.** Users' existing sheets depend on `backend/layout.ts`
   and `docs/data-model.md`. Never reorder or rename columns or rows. Add new entry columns only after
   `Updated At` (column I onward), add new settings keys inside the JSON, and bump `schemaVersion` with a
   migration if a change is not backwards compatible. Update `docs/data-model.md` in the same change.
3. **Write entries with `valueInputOption=RAW`.** Notes like `=IMPORTXML(...)` must stay text. Only the
   insight formulas in row 3 of a party tab are written as formulas (once, at tab creation).
4. **Address tabs by `sheetId`, rows by number and ID.** Tab titles change when a party is renamed;
   always quote titles with `quoteTitle()`. Before updating a row, re-read it and check the ID and
   `updatedAt` (see `SheetsBackend.updateEntry`); throw `ApiError('conflict')` on mismatch.
5. **Multi-step sheet changes go in one `batchUpdate`** so they are atomic (e.g. new tab + registry row).
6. **Dates are ISO strings (`YYYY-MM-DD`) and all date math is UTC** (`lib/dates.ts`). Never use
   `new Date('2026-10-23')` local getters for calendar logic.
7. **Money is a plain number, rounded to 2 decimals.** Format with `formatMoney(amount, currency)`.
8. **Errors are `ApiError` with a `kind`.** User-facing text comes from `google/errors.ts`; don't show raw
   Google messages except for `invalid`. An `auth` error flips the session to `expired`, which opens the
   "Continue with Google" dialog without losing form state.
9. **Nothing secret in the bundle.** Every `VITE_*` value is public. Never add a client secret, service
   account key or API key with broad permissions. The access token lives in `sessionStorage` only.
10. **Scope stays `drive.file`, and there is no API key.** `drive.file` is non-sensitive and limits the
    app to files it created. Do not request `spreadsheets` or `drive` scopes (forks would then need Google
    verification), and don't add Google Picker or anything else that needs an API key.

## UI conventions

- Match the existing look: Mist background, white cards, `rounded-[14px]`, hairline borders, cobalt brand
  (`brand`, `brand-strong`, `brand-soft`, `brand-softer`), green `income` for cash in, red `expense` for
  cash out, and marigold `highlight` only for things that are new or need a look. Text is Plus Jakarta Sans.
  Colours are tokens in `src/index.css`, taken from `brand/tokens/colors.css`; don't hard-code hex values in
  components. Use `<Logo>` / `<CashrowMark>` from `components/brand` instead of redrawing the mark.
- Wording: **You got** = cash in (`IN`), **You gave** = cash out (`OUT`) on the overview and sidebar. Party screens say
  **Cash in** / **Cash out** and buttons **Get cash** / **Give cash**, unless the party has its own labels
  (`outLabel` / `inLabel`, e.g. You paid / You owe). Take all of these from `entryLabels(party)`; never hard-code them.
  Balance captions: **Net in**, **Net out**, **Settled**, or **You'll give**, **You'll get**, **Settled** when the
  `balanceWording` setting is `settle`. Use `fmt.caption()` from `useFormatters`, never a hard-coded caption;
  sidebar rows use `fmt.caption(balance, { short: true })` ("Give" / "Get").
- Balances carry the green/red. On the overview, You got / You gave totals are neutral.
- Every control needs an accessible name. Use `<Field>` + `fieldA11y()` for form controls, real
  `<button>`s for actions, and keep focus visible. Calendar and pickers must stay keyboard operable.
- Settings are edited through form fields; JSON is a storage detail and is never shown in the UI.
- Desktop and tablet are first-class; phone layout should work but can be compact.

## Testing

- Unit tests live next to the code (`*.test.ts[x]`). Mock `@/google/sheetsApi` to test backend request
  shapes (see `backend/sheetsBackend.test.ts`); stub `fetch` to test the HTTP layer.
- For UI changes, run `npm run dev`, click **Try the demo**, and exercise the flow at 1440px and 820px.
- There are no tests against real Google APIs. If you change request shapes, check them against the
  [Sheets API reference](https://developers.google.com/sheets/api/reference/rest) and test with a real
  OAuth client in a scratch spreadsheet.

## Common tasks

**Add a field to entries** (e.g. "Reference no."): add it to `Entry`/`EntryInput` in `domain/types.ts`,
append a column in `layout.ts` (`PARTY_TAB.columns`, `COL`), map it in `mappers.ts`, update header
creation and the hidden-columns range in `sheetsBackend.ts`, handle it in `demoBackend.ts`, add the
input to `features/party/EntrySheet.tsx`, validate in `validateEntry`, update `docs/data-model.md`, and
remember existing sheets won't have the header until you migrate them.

**Add a global setting:** extend `GlobalSettings` and `DEFAULT_SETTINGS`, parse it leniently in
`parseGlobalSettings`, write it in `globalSettingsJson`, add a field to `GlobalSettingsDialog.tsx`.

**Add a deploy target:** keep it static. Document it in `docs/deployment.md`. If the host lacks an SPA
fallback, build with `VITE_ROUTER_MODE=hash`.

## Gotchas

- Google Identity Services opens a popup; call `requestAccessToken` only from a click handler.
- Tokens last about an hour and there is no refresh token (no backend). That is by design.
- `values.append` finds the table starting at the header row (row 5); keep row 4 empty.
- A tab named `__Settings` is reserved. Party names are unique, case-insensitively.
- GitHub Pages has no SPA fallback: the Pages workflow builds with hash routing and a base path.
- TypeScript 7 removed `baseUrl`; path aliases use `paths` only.
