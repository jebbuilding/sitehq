#!/usr/bin/env bash
# Lint .github/workflows with actionlint (https://github.com/rhysd/actionlint).
# CI installs it; locally: `brew install actionlint`. Without it this is skipped with a note,
# except in CI, where a missing linter is a failure.
set -euo pipefail
cd "$(dirname "$0")/../.."
if command -v actionlint >/dev/null 2>&1; then
  actionlint
  echo "workflows: actionlint $(actionlint -version | head -1) – clean"
elif [ -n "${CI:-}" ]; then
  echo "workflows: actionlint is not installed, and CI must not skip the lint" >&2
  exit 1
else
  echo "workflows: actionlint not installed – lint SKIPPED (brew install actionlint). infra/test/workflows.test.ts still ran."
fi
