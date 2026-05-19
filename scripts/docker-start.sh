#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo ""
  echo "ERROR: DATABASE_URL is not set."
  echo ""
  echo "On Railway:"
  echo "  1. Add a PostgreSQL database to your project"
  echo "  2. Open your web service → Variables"
  echo "  3. Add/reference DATABASE_URL from the Postgres service"
  echo "  4. Set JWT_SECRET to a long random string"
  echo "  5. Redeploy"
  echo ""
  exit 1
fi

npx prisma migrate deploy
exec npx tsx server/index.ts
