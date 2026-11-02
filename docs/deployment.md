# Deployment

The app is a static site: `npm run build` produces `dist/`, which any static host can serve. Every
deployment uses its own Google OAuth client ID, so each person or team running it keeps full control of
their data and their Google project.

**Before you start:** create an OAuth client ID ([google-cloud-setup.md](./google-cloud-setup.md)).
After deploying, add the site's origin (for example `https://cashrow.example.com`) to the client's
**Authorized JavaScript origins**.

## Configuration

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | yes, for Google sign-in | empty | OAuth web client ID |
| `VITE_ENABLE_DEMO` | no | `true` | Show "Try the demo" on the sign-in screen |
| `VITE_ROUTER_MODE` | no | `browser` | `browser` (clean URLs, needs SPA fallback) or `hash` |
| `VITE_BASE_PATH` | no | `/` | Sub-path the app is served from, e.g. `/cashrow/` |
| `VITE_APP_NAME` | no | `Cashrow` | Name in the header and browser tab. `Cashrow` shows the two-tone wordmark; any other name is shown as text next to the mark |
| `VITE_CONTACT_EMAIL` | no | empty | Contact shown on `/privacy` and `/terms`. Empty points people to the repository's GitHub issues |

`VITE_*` values are read at **build time** and end up in the JavaScript bundle. They are not secrets.
For hosts where you'd rather configure at **run time**, edit `config.js` in the built site (or use the
Docker image, which writes it from environment variables). Runtime values win over build-time values.

## Vercel

1. Push your fork to GitHub, then **Add New > Project** in Vercel and import it.
   Or use the button in the README.
2. Framework preset: Vite (detected). Build command `npm run build`, output `dist`.
3. **Environment Variables**: add `VITE_GOOGLE_CLIENT_ID` (and the optional ones).
4. Deploy. `vercel.json` already sets the SPA rewrite and security headers.
5. Add `https://<project>.vercel.app` (and any custom domain) to the OAuth client's JavaScript origins.

Preview deployments get their own URLs; add the ones you use, or test previews in demo mode.

## Netlify

1. **Add new site > Import an existing project** and pick your fork (or use the README button).
2. `netlify.toml` sets the build command, publish directory, SPA redirect and headers.
3. **Site configuration > Environment variables**: add `VITE_GOOGLE_CLIENT_ID`.
4. Deploy, then add `https://<site>.netlify.app` to the OAuth client.

## Cloudflare Pages

1. **Workers & Pages > Create > Pages > Connect to Git** and pick your fork.
2. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
3. Add `VITE_GOOGLE_CLIENT_ID` under **Environment variables** (Production, and Preview if you use it).
4. `public/_redirects` provides the SPA fallback.
5. Add `https://<project>.pages.dev` to the OAuth client.

## GitHub Pages

GitHub Pages has no SPA fallback, so this build uses hash URLs (`https://you.github.io/repo/#/parties/...`).
The workflow `.github/workflows/deploy-pages.yml` handles it.

1. **Settings > Pages > Build and deployment > Source**: GitHub Actions.
2. **Settings > Secrets and variables > Actions > Variables**:
   - `VITE_GOOGLE_CLIENT_ID`: your client ID
   - `ENABLE_GITHUB_PAGES`: `true` (deploys on every push to `main`)
   - optional: `VITE_ENABLE_DEMO`, `VITE_APP_NAME`
3. Push to `main`, or run the workflow manually from the **Actions** tab.
4. Add `https://<your-user>.github.io` to the OAuth client (the origin has no repo path).

## Docker (self-hosted)

The image builds the app once and reads Google settings from environment variables at container start,
so one image can serve many deployments.

```bash
docker build -t cashrow .
docker run -d -p 8080:80 \
  -e GOOGLE_CLIENT_ID=1234567890-abc.apps.googleusercontent.com \
  -e ENABLE_DEMO=false \
  cashrow
```

| Container env | Maps to |
| --- | --- |
| `GOOGLE_CLIENT_ID` | `VITE_GOOGLE_CLIENT_ID` |
| `ENABLE_DEMO` | `VITE_ENABLE_DEMO` |
| `APP_NAME` | `VITE_APP_NAME` |
| `CONTACT_EMAIL` | `VITE_CONTACT_EMAIL` |

Serve it over HTTPS (behind your reverse proxy) and add that origin to the OAuth client. Google allows
plain `http://` only for `localhost`.

## Any other static host

```bash
npm ci
VITE_GOOGLE_CLIENT_ID=... npm run build
# upload dist/
```

Configure the host to serve `index.html` for unknown paths (SPA fallback). If it can't, build with
`VITE_ROUTER_MODE=hash`. If the app lives under a sub-path, set `VITE_BASE_PATH=/that-path/`.

## Checklist after every new domain

- [ ] Origin added to **Authorized JavaScript origins**
- [ ] Consent screen lists your users as test users, or the app is published
- [ ] Sign in, create a spreadsheet, add a party and an entry, reload the page
