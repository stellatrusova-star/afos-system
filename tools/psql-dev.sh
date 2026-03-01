#!/usr/bin/env bash
set -euo pipefail
# Usage:
#   bash tools/psql-dev.sh 'select now();'
# Uses .env DATABASE_URL
URL="$(pnpm -s exec dotenv -e .env -- node -e 'process.stdout.write(process.env.DATABASE_URL||"")')"
if [ -z "${URL}" ]; then
  echo "DATABASE_URL missing (check .env)" >&2
  exit 1
fi
psql "${URL}" -v ON_ERROR_STOP=1 -c "$1"
