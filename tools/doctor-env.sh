#!/usr/bin/env bash
set -euo pipefail

echo "== AFOS ENV DOCTOR =="
echo "PWD: $(pwd)"

echo
echo "-- shell DATABASE_URL --"
echo "${DATABASE_URL-}"

echo
echo "-- dotenv .env DATABASE_URL --"
pnpm exec dotenv -e .env -- node -e 'console.log(process.env.DATABASE_URL || "")'

echo
echo "-- dotenv .env.test DATABASE_URL --"
pnpm exec dotenv -e .env.test -- node -e 'console.log(process.env.DATABASE_URL || "")'

echo
echo "-- prisma migrate status (.env) --"
pnpm exec dotenv -e .env -- pnpm exec prisma migrate status | sed -n '1,18p'
