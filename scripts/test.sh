#!/usr/bin/env bash
# Build, then run the core suite: flows + a crawl of every tab/button as owner, trade and client.
# Expect: "0" failures from flows, and "ERRORS (0)" for each crawl.
# Then the tests of SiteHQ's own backend and adapter (scripts/test-backend.mjs, also `npm run test:backend`):
# expect "backend tests: OK". Those fail the run if anything in them fails.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build.mjs
node scripts/modules.mjs --check   # structure checks + docs/MODULES.md is current
npx prettier --check src/app --log-level warn   # formatting (fix with: npm run format)
# the dev server finds a few things in the app by their source text: make sure it still builds a page for each role
PORT=4399 node scripts/dev.mjs >/dev/null & devpid=$!; sleep 1
for r in owner trade client; do curl -sf -o /dev/null "http://127.0.0.1:4399/$r" || { echo "dev server: /$r failed"; kill $devpid; exit 1; }; done; kill $devpid
cd tests
[ -d jspdfpkg ] || ../scripts/vendor.sh
out=$(node flows.js 2>&1 || true)
pass=$(echo "$out" | grep -c '✅' || true); fail=$(echo "$out" | grep -c '❌' || true)
echo "flows: $pass passed, $fail failed"; [ "$pass" -gt 0 ] || { echo "$out" | tail -20; exit 1; }
for r in owner trade client; do echo -n "crawl $r: "; node crawl.js $r 2>&1 | grep -E 'ERRORS' || echo "no result (crashed?)"; done
cd ..
node scripts/test-backend.mjs
