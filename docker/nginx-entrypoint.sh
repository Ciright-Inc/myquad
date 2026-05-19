#!/bin/sh
set -eu

# Railway frontend: BACKEND_URL=https://api.myquad.ciright.com
# Docker compose: API_UPSTREAM=http://backend:3001
API_UPSTREAM="${API_UPSTREAM:-${BACKEND_URL:-http://127.0.0.1:3001}}"
# Strip trailing slash — a trailing slash would strip /api from proxied paths.
API_UPSTREAM="${API_UPSTREAM%/}"
export API_UPSTREAM

PORT="${PORT:-80}"
export PORT

echo "[nginx] listening on port ${PORT}, proxying /api/* to ${API_UPSTREAM}/api/*"

envsubst '${API_UPSTREAM} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
