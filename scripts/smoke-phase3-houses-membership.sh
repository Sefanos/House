#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-owner-cli.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-member-cli.XXXXXX.toml)"

cleanup() {
  rm -f "${OWNER_CONFIG}" "${MEMBER_CONFIG}"
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

  echo "[house-phase3] ${label}"
  local output
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"

  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[house-phase3] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"

  echo "[house-phase3] ${label}"
  local output
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"

  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[house-phase3] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

expect_failure_with_log() {
  local label="$1"
  local expected_message="$2"
  local cli_root="$3"
  shift 3

  echo "[house-phase3] ${label} (expecting failure)"
  if run_call_as "${cli_root}" "$@"; then
    echo "[house-phase3] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi

  if ! spacetime logs --server "${SPACETIME_SERVER}" "${DATABASE_NAME}" --num-lines 200 | rg -F -q "${expected_message}"; then
    echo "[house-phase3] ${label} failed: expected log message not found: ${expected_message}"
    exit 1
  fi
}

echo "[house-phase3] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[house-phase3] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[house-phase3] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[house-phase3] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
OWNER_USERNAME="p3o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p3m_${TS: -4}_$((RANDOM % 9000 + 1000))"
PASSWORD="houseplan-pass-123"
HOUSE_NAME="Phase 3 House"
HOUSE_DESCRIPTION="House created by smoke phase 3."

echo "[house-phase3] register owner identity ${OWNER_USERNAME}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_register "${OWNER_USERNAME}" "${PASSWORD}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_assert_session

echo "[house-phase3] create house as owner"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "${HOUSE_DESCRIPTION}" "" true "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[house-phase3] failed: could not resolve created house id."
  exit 1
fi

OWNER_USER_ID="$(
  run_sql "${DATABASE_NAME}" "select id from users where username = '${OWNER_USERNAME}'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${OWNER_USER_ID}" ]]; then
  echo "[house-phase3] failed: could not resolve owner user id."
  exit 1
fi

expect_sql_contains \
  "owner membership inserted on createHouse" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${OWNER_USER_ID}\""

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
    | rg -o "\"[A-Z0-9]{6,12}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[house-phase3] failed: could not resolve invite code for created house."
  exit 1
fi

echo "[house-phase3] register member identity ${MEMBER_USERNAME}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_register "${MEMBER_USERNAME}" "${PASSWORD}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_assert_session

MEMBER_USER_ID="$(
  run_sql "${DATABASE_NAME}" "select id from users where username = '${MEMBER_USERNAME}'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${MEMBER_USER_ID}" ]]; then
  echo "[house-phase3] failed: could not resolve member user id."
  exit 1
fi

echo "[house-phase3] join house by invite as member"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

expect_sql_contains \
  "member inserted after joinByInvite" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${MEMBER_USER_ID}\""

expect_failure_with_log \
  "non-owner cannot delete house" \
  "Only house owner can perform this action." \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  house_delete_house \
  "${HOUSE_ID}"

echo "[house-phase3] owner kicks member"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_kick_member "${HOUSE_ID}" "${MEMBER_USER_ID}"

expect_sql_not_contains \
  "kicked member removed from membership" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${MEMBER_USER_ID}\""

echo "[house-phase3] owner deletes house"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_delete_house "${HOUSE_ID}"

expect_sql_not_contains \
  "house removed after deleteHouse" \
  "select id from houses where id = '${HOUSE_ID}'" \
  "\"${HOUSE_ID}\""

expect_sql_not_contains \
  "memberships removed after deleteHouse" \
  "select house_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${HOUSE_ID}\""

expect_sql_not_contains \
  "invites removed after deleteHouse" \
  "select house_id from invites where house_id = '${HOUSE_ID}'" \
  "\"${HOUSE_ID}\""

echo "[house-phase3] phase 3 houses + membership acceptance checks passed"
