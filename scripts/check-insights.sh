#!/usr/bin/env bash
# Walk every route against `next dev` and fail if Next raised any Cache
# Components validation insight.
#
# ⚠️ This exists because insights DO NOT appear in `npm run build` or in the
# HTTP response. An offending route still returns 200 with correct HTML, and the
# build is clean — the dev overlay and the dev-server log are the only places
# they surface. Skipping this step on 2026-08-20 nearly shipped ten routes with
# `blocking-prerender-current-time`.
#
# Not in CI: it needs a dev server, a browser and the Supabase stack, and it is
# a design-time check rather than a regression gate. Run it after touching any
# route, layout, or anything they all share.
#
# Usage: npm run insights
set -euo pipefail

LOG="$(mktemp -t fitcheck-insights)"
trap 'kill "${DEV_PID:-}" 2>/dev/null || true; rm -f "$LOG"' EXIT

set -a; source .env.local; set +a

npm run dev >"$LOG" 2>&1 &
DEV_PID=$!

echo "waiting for the dev server…"
until curl -sf -o /dev/null http://127.0.0.1:3000/ 2>/dev/null; do sleep 2; done

# The walk itself is a Playwright spec so it reuses the signed-in storageState;
# an unauthenticated walk just redirects and proves nothing.
E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test e2e/walk.spec.ts --grep @insights >/dev/null 2>&1 || true

# Strip ANSI so grep sees the text, and count anything Next flagged.
FOUND=$(sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -c "blocking-prerender\|unstable value" || true)

if [ "$FOUND" -gt 0 ]; then
  echo "❌ $FOUND validation insight(s):"
  sed 's/\x1b\[[0-9;]*m//g' "$LOG" | grep -A 12 "blocking-prerender\|unstable value" | head -60
  exit 1
fi

echo "✅ no validation insights across the walked routes"
