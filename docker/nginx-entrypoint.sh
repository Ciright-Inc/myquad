#!/bin/sh
set -eu

API_UPSTREAM="${API_UPSTREAM:-http://127.0.0.1:3001}"
export API_UPSTREAM

# Ensure trailing slash for proxy_pass + /api/ location
case "$API_UPSTREAM" in
  */) ;;
  *) API_UPSTREAM="${API_UPSTREAM}/" ;;
esac
export API_UPSTREAM

envsubst '${API_UPSTREAM}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
