#!/bin/sh
# Writes /usr/share/nginx/html/config.js from container environment variables.
# Runs automatically before nginx starts (official nginx image entrypoint hook).
set -eu

escape() {
  # Escape backslashes and double quotes for a JS string literal.
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

target="/usr/share/nginx/html/config.js"

cat > "$target" <<EOF
window.__CASHROW_CONFIG__ = {
  GOOGLE_CLIENT_ID: "$(escape "${GOOGLE_CLIENT_ID:-}")",
  ENABLE_DEMO: "$(escape "${ENABLE_DEMO:-true}")",
  APP_NAME: "$(escape "${APP_NAME:-Cashrow}")"
};
EOF

echo "cashrow: wrote runtime config to $target"
