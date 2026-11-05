#!/usr/bin/env bash
# Build, then run the core suite: flows + a crawl of every tab/button as owner, trade and client.
# Expect: "0" failures from flows, and "ERRORS (0)" for each crawl.
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/build.mjs
cd tests
[ -d jspdfpkg ] || ../scripts/vendor.sh
out=$(node flows.js 2>&1 || true)
pass=$(echo "$out" | grep -c '✅' || true); fail=$(echo "$out" | grep -c '❌' || true)
echo "flows: $pass passed, $fail failed"; [ "$pass" -gt 0 ] || { echo "$out" | tail -20; exit 1; }
for r in owner trade client; do echo -n "crawl $r: "; node crawl.js $r 2>&1 | grep -E 'ERRORS' || echo "no result (crashed?)"; done
