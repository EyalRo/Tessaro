#!/bin/sh
set -euo pipefail

API_URL="${VITE_USERS_API_URL:-/api}"
ESCAPED_API_URL=$(printf '%s' "$API_URL" | sed 's/"/\\"/g')
cat <<SCRIPT > ./dist/env.js
window.VITE_USERS_API_URL = "${ESCAPED_API_URL}";
SCRIPT

exec npm run preview -- --host 0.0.0.0 --port "${PORT:-4173}"
