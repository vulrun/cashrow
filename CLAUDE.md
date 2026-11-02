# CLAUDE.md

@AGENTS.md

## Notes for Claude

- Start every task by reading `AGENTS.md` (imported above) and the doc in `docs/` that matches the area
  you are changing: `data-model.md` for anything touching the spreadsheet, `architecture.md` for state
  and data flow, `deployment.md` for hosting, `security.md` for auth and tokens.
- Before finishing, run `npm run check` and `npm run build`. For UI work, also try the change in demo mode.
- Keep the spreadsheet layout backwards compatible (rule 2 in `AGENTS.md`). If a change would break
  existing users' sheets, stop and propose a migration instead.
