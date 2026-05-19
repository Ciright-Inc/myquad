#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "ERROR: DATABASE_URL is not set."
  echo ""
  echo "On Railway:"
  echo "  1. Add PostgreSQL to the project (if missing)"
  echo "  2. Web service → Variables → New Variable"
  echo "  3. Name: DATABASE_URL  Value: \${{Postgres.DATABASE_URL}}  (use Variable Reference)"
  echo "  4. Set JWT_SECRET"
  echo "  5. Redeploy"
  echo ""
  exit 1
fi

case "$DATABASE_URL" in
  *localhost*|*127.0.0.1*)
    echo ""
    echo "ERROR: DATABASE_URL points to localhost — that is not your Railway Postgres."
    echo "Current value starts with: $(printf '%.60s' "$DATABASE_URL")..."
    echo ""
    echo "Fix: delete any manual DATABASE_URL on the web service and add a reference:"
    echo "  Variables → DATABASE_URL → Reference → your Postgres service → DATABASE_URL"
    echo ""
    exit 1
    ;;
esac

npx prisma migrate deploy
exec npx tsx server/index.ts
