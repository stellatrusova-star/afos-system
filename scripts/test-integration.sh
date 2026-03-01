#!/usr/bin/env bash
set -euo pipefail

PORT=3000

# Kill anything on 3000 (best-effort)
if command -v lsof >/dev/null 2>&1; then
  kill -9 "$(lsof -tiTCP:${PORT} -sTCP:LISTEN 2>/dev/null)" 2>/dev/null || true
fi

# Deterministic DB: test env only
pnpm exec dotenv -e .env.test -- prisma migrate reset --force --skip-seed
pnpm exec dotenv -e .env.test -- bash -lc "node scripts/seed-test-fixtures.mjs && node scripts/seed-test-admin.mjs"

# Start server + run tests
pnpm exec concurrently -k -s first -n DEV,TEST \
  "pnpm run dev:test" \
  "pnpm exec wait-on http://127.0.0.1:${PORT}/api/health && pnpm exec dotenv -e .env.test -- vitest run --no-file-parallelism --maxWorkers=1 --environment node tests/integration/closed-period.test.ts tests/integration/first-admin-bootstrap.test.ts tests/integration/clients-create.test.ts"
