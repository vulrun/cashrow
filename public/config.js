// Runtime configuration. Optional.
//
// Most hosts (Vercel, Netlify, Cloudflare Pages, GitHub Pages) bake settings in at
// build time through VITE_* environment variables, so you can leave this file as is.
//
// The Docker image rewrites this file on start-up from container environment
// variables, which lets one image serve many deployments. Any key set here wins
// over the build-time value. See docs/deployment.md.
window.__CASHROW_CONFIG__ = window.__CASHROW_CONFIG__ || {
  // GOOGLE_CLIENT_ID: "1234567890-abc.apps.googleusercontent.com",
  // ENABLE_DEMO: "true",
  // APP_NAME: "Cashrow",
}
