# Contributing

Thanks for helping improve Cashrow.

## Setup

```bash
npm ci
npm run dev        # http://localhost:5173, use "Try the demo"
```

You don't need a Google Cloud project for most changes: demo mode exercises the whole UI through the
same `Backend` interface. If your change touches `src/backend/sheetsBackend.ts` or `src/google/`, test it
against a scratch spreadsheet with your own OAuth client ([docs/google-cloud-setup.md](docs/google-cloud-setup.md)).

## Before you open a pull request

- Read [AGENTS.md](AGENTS.md); it lists the rules that keep users' spreadsheets safe.
- Run `npm run check` (lint, typecheck, tests) and `npm run build`.
- Add or update tests next to the code you changed.
- If you change what is written to the spreadsheet, update [docs/data-model.md](docs/data-model.md) and
  keep existing sheets working.
- For UI changes, include a screenshot at desktop (1440px) and tablet (820px) widths.
- Keep pull requests focused: one feature or fix each.

## Reporting bugs

Open an issue with steps to reproduce, what you expected, what happened, and your browser. Never paste
access tokens, client secrets or real financial data. For security issues, see [SECURITY.md](SECURITY.md).
