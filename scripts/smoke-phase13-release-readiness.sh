#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

expect_source_contains() {
  local label="$1"
  local file="$2"
  local expected="$3"

  echo "[phase13] ${label}"
  if ! rg -F -q "${expected}" "${file}"; then
    echo "[phase13] ${label} failed: expected '${expected}' in ${file}"
    exit 1
  fi
}

echo "[phase13] hardening source checks"
expect_source_contains \
  "app-level error boundary is present" \
  "apps/web/app/error.tsx" \
  "Something went wrong."
expect_source_contains \
  "global error boundary is present" \
  "apps/web/app/global-error.tsx" \
  "Application error"
expect_source_contains \
  "connectivity banner handles reconnecting state" \
  "apps/web/components/system/ConnectionBanner.tsx" \
  "Reconnecting to realtime services"
expect_source_contains \
  "app layout mounts connection banner" \
  "apps/web/app/(app)/layout.tsx" \
  "ConnectionBanner"

echo "[phase13] running integrated smoke scenarios"
pnpm smoke:phase7-invites-moderation
pnpm smoke:phase8-dms
pnpm smoke:phase9-voice
pnpm smoke:phase11-discovery-public-profiles

echo "[phase13] release build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[phase13] phase 13 release-readiness acceptance checks passed"
