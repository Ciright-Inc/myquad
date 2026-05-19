#!/bin/sh
set -eu

# Railway frontend service may set BACKEND_URL; docker-compose uses API_UPSTREAM.
API_UPSTREAM="${API_UPSTREAM:-${BACKEND_URL:-http://127.0.0.1:3001}}"
export API_UPSTREAM

PORT="${PORT:-80}"
export PORT

# Ensure trailing slash for proxy_pass + /api/ location
case "$API_UPSTREAM" in
  */) ;;
  *) API_UPSTREAM="${API_UPSTREAM}/" ;;
esac
export API_UPSTREAM

echo "[nginx] listening on port ${PORT}, proxying /api/ to ${API_UPSTREAM}"

envsubst '${API_UPSTREAM} ${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
