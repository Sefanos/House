#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

USER_A_CONFIG="$(mktemp /tmp/houseplan-phase8-user-a.XXXXXX.toml)"
USER_B_CONFIG="$(mktemp /tmp/houseplan-phase8-user-b.XXXXXX.toml)"
USER_C_CONFIG="$(mktemp /tmp/houseplan-phase8-user-c.XXXXXX.toml)"

cleanup() {
  rm -f "${USER_A_CONFIG}" "${USER_B_CONFIG}" "${USER_C_CONFIG}"
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

  echo "[dms-phase8] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[dms-phase8] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[dms-phase8] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[dms-phase8] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

expect_sql_matches() {
  local label="$1"
  local query="$2"
  local pattern="$3"
  local output

  echo "[dms-phase8] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -q "${pattern}"; then
    echo "[dms-phase8] ${label} failed: expected SQL output to match regex ${pattern}"
    exit 1
  fi
}

expect_call_failure() {
  local label="$1"
  local cli_config="$2"
  shift 2

  echo "[dms-phase8] ${label} (expecting failure)"
  set +e
  local output
  output="$(run_call_as "${cli_config}" "$@" 2>&1)"
  local status=$?
  set -e
  echo "${output}"

  if [[ ${status} -eq 0 ]]; then
    echo "[dms-phase8] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi
}

resolve_user_id() {
  local username="$1"
  run_sql "${DATABASE_NAME}" "select id from users where username = '${username}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
}

register_user() {
  local config="$1"
  local username="$2"
  local password="$3"
  run_call_as "${config}" "${DATABASE_NAME}" auth_register "${username}" "${password}"
  run_call_as "${config}" "${DATABASE_NAME}" auth_assert_session
}

echo "[dms-phase8] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[dms-phase8] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[dms-phase8] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[dms-phase8] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
USER_A_USERNAME="p8a_${TS: -4}_$((RANDOM % 9000 + 1000))"
USER_B_USERNAME="p8b_${TS: -4}_$((RANDOM % 9000 + 1000))"
USER_C_USERNAME="p8c_${TS: -4}_$((RANDOM % 9000 + 1000))"

register_user "${USER_A_CONFIG}" "${USER_A_USERNAME}" "${PASSWORD}"
register_user "${USER_B_CONFIG}" "${USER_B_USERNAME}" "${PASSWORD}"
register_user "${USER_C_CONFIG}" "${USER_C_USERNAME}" "${PASSWORD}"

USER_A_ID="$(resolve_user_id "${USER_A_USERNAME}")"
USER_B_ID="$(resolve_user_id "${USER_B_USERNAME}")"
USER_C_ID="$(resolve_user_id "${USER_C_USERNAME}")"
if [[ -z "${USER_A_ID}" || -z "${USER_B_ID}" || -z "${USER_C_ID}" ]]; then
  echo "[dms-phase8] failed: could not resolve user ids"
  exit 1
fi

echo "[dms-phase8] send DMs in both directions"
run_call_as "${USER_A_CONFIG}" "${DATABASE_NAME}" dms_send_dm "${USER_B_ID}" "hello from user A"
run_call_as "${USER_B_CONFIG}" "${DATABASE_NAME}" dms_send_dm "${USER_A_ID}" "hello from user B"
run_call_as "${USER_C_CONFIG}" "${DATABASE_NAME}" dms_send_dm "${USER_B_ID}" "hello from user C"

DM_A_TO_B_ID="$(
  run_sql "${DATABASE_NAME}" "select id from dm_messages where from_user_id = '${USER_A_ID}' and to_user_id = '${USER_B_ID}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
DM_B_TO_A_ID="$(
  run_sql "${DATABASE_NAME}" "select id from dm_messages where from_user_id = '${USER_B_ID}' and to_user_id = '${USER_A_ID}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${DM_A_TO_B_ID}" || -z "${DM_B_TO_A_ID}" ]]; then
  echo "[dms-phase8] failed: could not resolve DM ids"
  exit 1
fi

if [[ "${USER_A_ID}" < "${USER_B_ID}" ]]; then
  EXPECTED_CONVERSATION_KEY="${USER_A_ID}_${USER_B_ID}"
else
  EXPECTED_CONVERSATION_KEY="${USER_B_ID}_${USER_A_ID}"
fi

echo "[dms-phase8] canonical conversation key validation"
expect_sql_contains \
  "A->B DM uses canonical key" \
  "select conversation_key from dm_messages where id = '${DM_A_TO_B_ID}'" \
  "${EXPECTED_CONVERSATION_KEY}"
expect_sql_contains \
  "B->A DM uses same canonical key" \
  "select conversation_key from dm_messages where id = '${DM_B_TO_A_ID}'" \
  "${EXPECTED_CONVERSATION_KEY}"

expect_sql_contains \
  "history query includes user A message" \
  "select * from dm_messages where conversation_key = '${EXPECTED_CONVERSATION_KEY}'" \
  "hello from user A"
expect_sql_contains \
  "history query includes user B message" \
  "select * from dm_messages where conversation_key = '${EXPECTED_CONVERSATION_KEY}'" \
  "hello from user B"
expect_sql_not_contains \
  "history query excludes unrelated user C message" \
  "select * from dm_messages where conversation_key = '${EXPECTED_CONVERSATION_KEY}'" \
  "hello from user C"

echo "[dms-phase8] edit and delete lifecycle"
run_call_as "${USER_A_CONFIG}" "${DATABASE_NAME}" dms_edit_dm "${DM_A_TO_B_ID}" "hello from user A (edited)"
expect_sql_contains \
  "edited DM persisted" \
  "select * from dm_messages where id = '${DM_A_TO_B_ID}'" \
  "hello from user A (edited)"

run_call_as "${USER_B_CONFIG}" "${DATABASE_NAME}" dms_edit_dm "${DM_B_TO_A_ID}" "hello from user B (edited)"
expect_sql_contains \
  "recipient-authored DM edit persisted" \
  "select * from dm_messages where id = '${DM_B_TO_A_ID}'" \
  "hello from user B (edited)"

expect_call_failure \
  "non-author cannot edit another user's DM" \
  "${USER_B_CONFIG}" \
  "${DATABASE_NAME}" \
  dms_edit_dm \
  "${DM_A_TO_B_ID}" \
  "forbidden edit"

run_call_as "${USER_A_CONFIG}" "${DATABASE_NAME}" dms_delete_dm "${DM_A_TO_B_ID}"
expect_sql_matches \
  "soft delete keeps DM row with deleted_at timestamp" \
  "select * from dm_messages where id = '${DM_A_TO_B_ID}'" \
  "\|\s*\"\"\s*\|\s*\"[0-9]{4}-[0-9]{2}-[0-9]{2}T"

expect_call_failure \
  "non-author cannot delete another user's DM" \
  "${USER_B_CONFIG}" \
  "${DATABASE_NAME}" \
  dms_delete_dm \
  "${DM_A_TO_B_ID}"

echo "[dms-phase8] web DM build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[dms-phase8] phase 8 DMs acceptance checks passed"
