# Security and privacy

## What the app can access

- It requests `openid email profile` and `https://www.googleapis.com/auth/drive.file`.
- `drive.file` limits access to the spreadsheets the app created. The app cannot list or read anything
  else in the user's Drive, and it doesn't use a Google API key at all.
- Data goes from the browser straight to Google. There is no server, database, analytics or tracking
  in this project. Whoever deploys it controls the Google Cloud project and its OAuth client.

## Tokens

- Access tokens come from Google Identity Services (token model) and last about an hour. There is no
  refresh token, and the app never sees a client secret.
- The token is kept in memory and in `sessionStorage` (this tab only, cleared when the tab closes) so a
  page reload doesn't force a new sign-in. It is never written to `localStorage`.
- The user's name, email and chosen spreadsheet id are kept in `localStorage` to say "Welcome back".
- Signing out revokes the token with Google and clears the stored session.

## Writing data safely

- Entries and notes are written with `valueInputOption=RAW`, so a note like `=IMPORTXML("https://evil")`
  is stored as text and never evaluated. This prevents formula injection into the user's sheet.
- Edits re-read the target row and refuse to overwrite it if the ID or `Updated At` changed
  (`conflict`), which protects changes made directly in Google Sheets.
- Multi-step changes (new party tab + registry row) are sent as one atomic `batchUpdate`.

## Headers and hosting

`vercel.json`, `netlify.toml` and `docker/nginx.conf` set `X-Content-Type-Options`, `Referrer-Policy`,
`X-Frame-Options: DENY` and a restrictive `Permissions-Policy`.

A Content Security Policy is not set by default, because a wrong policy silently breaks Google sign-in.
The app only loads Google Identity Services from Google; fonts and icons are bundled. If you add a
policy, start from this and test sign-in, sign-out and saving an entry:

```
default-src 'self';
script-src 'self' https://accounts.google.com/gsi/client;
connect-src 'self' https://sheets.googleapis.com https://www.googleapis.com https://oauth2.googleapis.com https://accounts.google.com/gsi/;
frame-src https://accounts.google.com/gsi/;
style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style;
img-src 'self' data: https://*.googleusercontent.com;
font-src 'self';
```

## Configuration hygiene

- Everything in `VITE_*` and `config.js` is public. An OAuth client ID is designed to be public; it is
  protected by the list of Authorized JavaScript origins, so keep that list tight.
- Never add a client secret or service-account key to this project.

## Reporting a vulnerability

Please open a private security advisory on GitHub (**Security > Report a vulnerability**) rather than a
public issue. Include steps to reproduce and the affected version or commit.
