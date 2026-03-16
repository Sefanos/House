#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

run_call() {
  spacetime call --server "${SPACETIME_SERVER}" "$@"
}

expect_success() {
  local label="$1"
  shift
  echo "[auth-phase1] ${label}"
  run_call "$@"
}

expect_failure_with_log() {
  local label="$1"
  local expected_message="$2"
  shift 2
  echo "[auth-phase1] ${label} (expecting failure)"
  if run_call "$@"; then
    echo "[auth-phase1] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi

  if ! spacetime logs --server "${SPACETIME_SERVER}" "${DATABASE_NAME}" --num-lines 120 | rg -q "${expected_message}"; then
    echo "[auth-phase1] ${label} failed: expected log message \"${expected_message}\" not found."
    exit 1
  fi
}

echo "[auth-phase1] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[auth-phase1] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[auth-phase1] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[auth-phase1] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

echo "[auth-phase1] building spacetime client package"
pnpm --filter @houseplan/spacetime-client build

USERNAME="phase1_$(date +%s)_${RANDOM}"
GOOD_PASSWORD="houseplan-pass-123"
BAD_PASSWORD="wrong-password"

echo "[auth-phase1] running phase 1 auth acceptance checks with username ${USERNAME}"

expect_success "register" "${DATABASE_NAME}" auth_register "${USERNAME}" "${GOOD_PASSWORD}"
expect_success "session assertion after register" "${DATABASE_NAME}" auth_assert_session

expect_success "logout" "${DATABASE_NAME}" auth_logout
expect_failure_with_log \
  "expired session assertion after logout" \
  "Session expired." \
  "${DATABASE_NAME}" \
  auth_assert_session

expect_failure_with_log \
  "login with invalid credentials" \
  "Invalid username or password." \
  "${DATABASE_NAME}" \
  auth_login \
  "${USERNAME}" \
  "${BAD_PASSWORD}"

expect_success "login with valid credentials" "${DATABASE_NAME}" auth_login "${USERNAME}" "${GOOD_PASSWORD}"
expect_success "session assertion after login" "${DATABASE_NAME}" auth_assert_session

expect_failure_with_log \
  "unauthenticated token assertion" \
  "Not authenticated." \
  --anonymous \
  "${DATABASE_NAME}" \
  auth_assert_session

echo "[auth-phase1] phase 1 auth acceptance checks passed"
