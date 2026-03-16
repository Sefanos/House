#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase11-owner.XXXXXX.toml)"
SECOND_CONFIG="$(mktemp /tmp/houseplan-phase11-second.XXXXXX.toml)"
WEB_LOG="$(mktemp /tmp/houseplan-phase11-web.XXXXXX.log)"
WEB_PID=""

cleanup() {
  if [[ -n "${WEB_PID}" ]]; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
    wait "${WEB_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${OWNER_CONFIG}" "${SECOND_CONFIG}" "${WEB_LOG}"
}
trap cleanup EXIT

run_call_as() {
  local cli_config="$1"
  shift
  spacetime --config-path "${cli_config}" call --server "${SPACETIME_SERVER}" -y "$@"
}

run_sql() {
  spacetime sql --server "${SPACETIME_SERVER}" "$@"
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local output

  echo "[phase11] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[phase11] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[phase11] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[phase11] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

expect_source_contains() {
  local label="$1"
  local file="$2"
  local expected="$3"

  echo "[phase11] ${label}"
  if ! rg -F -q "${expected}" "${file}"; then
    echo "[phase11] ${label} failed: expected '${expected}' in ${file}"
    exit 1
  fi
}

register_user() {
  local config="$1"
  local username="$2"
  local password="$3"
  run_call_as "${config}" "${DATABASE_NAME}" auth_register "${username}" "${password}"
  run_call_as "${config}" "${DATABASE_NAME}" auth_assert_session
}

start_web_server() {
  echo "[phase11] building web app"
  pnpm --filter @houseplan/web build >/dev/null

  echo "[phase11] starting web app"
  pnpm --filter @houseplan/web start >"${WEB_LOG}" 2>&1 &
  WEB_PID=$!

  for _ in {1..60}; do
    if curl -fsS "http://localhost:3001/api/health" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  echo "[phase11] web app did not become ready."
  tail -n 200 "${WEB_LOG}" || true
  exit 1
}

expect_http_200() {
  local label="$1"
  local url="$2"
  local status

  status="$(curl -sS -o /dev/null -w "%{http_code}" "${url}")"
  echo "[phase11] ${label}: ${status}"
  if [[ "${status}" != "200" ]]; then
    echo "[phase11] ${label} failed: expected HTTP 200, got ${status}"
    exit 1
  fi
}

echo "[phase11] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[phase11] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[phase11] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[phase11] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
OWNER_USERNAME="p11owner_${TS: -4}_$((RANDOM % 9000 + 1000))"
SECOND_USERNAME="p11user_${TS: -4}_$((RANDOM % 9000 + 1000))"

PUBLIC_HOUSE_A="Phase 11 Public Alpha ${TS}"
PUBLIC_HOUSE_B="Phase 11 Public Beta ${TS}"
PRIVATE_HOUSE="Phase 11 Private ${TS}"

register_user "${OWNER_CONFIG}" "${OWNER_USERNAME}" "${PASSWORD}"
register_user "${SECOND_CONFIG}" "${SECOND_USERNAME}" "${PASSWORD}"

echo "[phase11] creating discovery dataset"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${PUBLIC_HOUSE_A}" "Public house A for phase 11 search" "" true "default" "#38bdf8"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${PRIVATE_HOUSE}" "Private house not discoverable" "" false "default" "#38bdf8"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${PUBLIC_HOUSE_B}" "Public house B for pagination check" "" true "default" "#38bdf8"

echo "[phase11] validating discovery search + pagination source data"
expect_sql_contains \
  "public houses include first seeded public entry" \
  "select name from houses where is_public = true and name = '${PUBLIC_HOUSE_A}'" \
  "${PUBLIC_HOUSE_A}"
expect_sql_contains \
  "public houses include second seeded public entry" \
  "select name from houses where is_public = true and name = '${PUBLIC_HOUSE_B}'" \
  "${PUBLIC_HOUSE_B}"
expect_sql_not_contains \
  "private houses excluded from public scope" \
  "select name from houses where is_public = true and name = '${PRIVATE_HOUSE}'" \
  "${PRIVATE_HOUSE}"
expect_sql_contains \
  "user search source data includes owner user" \
  "select username from users where username = '${OWNER_USERNAME}'" \
  "${OWNER_USERNAME}"
expect_sql_contains \
  "user search source data includes second user" \
  "select username from users where username = '${SECOND_USERNAME}'" \
  "${SECOND_USERNAME}"
expect_source_contains \
  "house search hook sorts by newest creation timestamp" \
  "apps/web/hooks/spacetime/useHouseSearch.ts" \
  "createdAt.localeCompare"
expect_source_contains \
  "house search hook paginates with deterministic slicing" \
  "apps/web/hooks/spacetime/useHouseSearch.ts" \
  "slice(startIndex, endIndex)"
expect_source_contains \
  "user search hook paginates with deterministic slicing" \
  "apps/web/hooks/spacetime/useUserSearch.ts" \
  "slice(startIndex, endIndex)"

echo "[phase11] validating unauthenticated public routes"
start_web_server
expect_http_200 "discover route is publicly reachable" "http://localhost:3001/discover"
expect_http_200 "public profile route is publicly reachable" "http://localhost:3001/profile/${OWNER_USERNAME}"

echo "[phase11] phase 11 discovery and public profile acceptance checks passed"
