# Google Cloud setup

Cashrow signs people in with Google and talks to the Sheets and Drive APIs from the browser.
For that, every deployment needs its **own OAuth client ID** from a Google Cloud project. It's free and
takes about ten minutes. Nothing here costs money at normal usage.

You will end up with one value: `VITE_GOOGLE_CLIENT_ID`, something like
`1234567890-abc123.apps.googleusercontent.com`. No API key is needed.

> The Cloud Console changes its menus from time to time. Recent versions group OAuth settings under
> **Google Auth Platform** (Branding, Audience, Data Access, Clients). Older versions call it the
> **OAuth consent screen** and put clients under **APIs & Services > Credentials**. The fields are the same.

## 1. Create a project

1. Open <https://console.cloud.google.com/> and sign in.
2. Project picker (top bar) > **New project**. Name it, for example `cashrow`, and create it.
3. Make sure the new project is selected.

## 2. Enable the APIs

**APIs & Services > Library**, then enable:

- **Google Sheets API**
- **Google Drive API**

## 3. Configure the consent screen

Open **Google Auth Platform** (or **APIs & Services > OAuth consent screen**).

1. **Branding**: app name (what users see on Google's sign-in screen), a support email, and your
   developer contact email. Optionally add your logo, your site URL as the application home page
   (`https://<your-site>/` shows the landing page to signed-out visitors), and the app's own legal pages:
   privacy policy `https://<your-site>/privacy` and terms of service `https://<your-site>/terms`
   (with hash routing, e.g. GitHub Pages: `https://<your-site>/#/privacy` and `/#/terms`). Set
   `VITE_CONTACT_EMAIL` so those pages show your contact address (see `docs/deployment.md`).
2. **Audience**: choose **External** (or **Internal** if everyone is in your Google Workspace domain).
   While the app is in **Testing**, only the **test users** you list here can sign in. Add your own
   Google account and anyone else who will use it.
3. **Data access**: add these scopes:
   - `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
   - `https://www.googleapis.com/auth/drive.file`

`drive.file` is a non-sensitive scope: the app can only see the spreadsheets it created. Because no sensitive or restricted scopes are used, you don't need Google's security
assessment. To let anyone with a Google account sign in (not just test users), click **Publish app**
under Audience; Google may ask you to verify your app's branding (name, logo, domain) first.

## 4. Create the OAuth client ID

**Google Auth Platform > Clients > Create client** (or **Credentials > Create credentials > OAuth client ID**).

1. Application type: **Web application**.
2. Name: anything, for example `Cashrow web`.
3. **Authorized JavaScript origins**: add every origin the app is served from. Scheme, host and port
   must match exactly; no paths and no trailing slash.
   - `http://localhost:5173` (local development)
   - `https://your-app.vercel.app` (or your Netlify, Cloudflare Pages or custom domain)
   - `https://your-user.github.io` (GitHub Pages; the repo path is not part of the origin)
4. **Authorized redirect URIs**: leave empty. The app uses the popup-based token model.
5. Create, then copy the **Client ID**. You don't need the client secret; never put it in this app.

Set it as `VITE_GOOGLE_CLIENT_ID` (see [deployment.md](./deployment.md)).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Error 400: redirect_uri_mismatch` or `origin_mismatch` | The page's origin isn't in **Authorized JavaScript origins**. Add it exactly (no trailing slash). Changes can take a few minutes. |
| `Error 403: access_denied` / "app has not completed verification" | The account isn't a test user while the app is in Testing. Add it under Audience, or publish the app. |
| "Cashrow needs permission to create and edit its own spreadsheets" | The user unticked the Drive box on the consent screen. Sign in again and keep it ticked. |
| Popup blocked | Allow pop-ups for the site. Sign-in must start from a click. |
| "Google sign-in isn't set up on this site yet" | `VITE_GOOGLE_CLIENT_ID` is empty in this build or in `config.js`. |
| "This Google account can't open that spreadsheet" | With `drive.file` the app only sees spreadsheets it created, and only for the account that created them. Sign in with that account, or create a new cash book. |
| The setup screen doesn't list a spreadsheet you made by hand | Expected: the app can't see files it didn't create. Create a cash book from the setup screen instead. |
