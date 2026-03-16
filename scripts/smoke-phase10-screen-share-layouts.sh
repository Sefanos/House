#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"
PERM_SHARE_SCREEN="8388608"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase10-owner.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase10-member.XXXXXX.toml)"

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

expect_call_failure() {
  local label="$1"
  local cli_config="$2"
  shift 2

  echo "[phase10] ${label} (expecting failure)"
  set +e
  local output
  output="$(run_call_as "${cli_config}" "$@" 2>&1)"
  local status=$?
  set -e
  echo "${output}"

  if [[ ${status} -eq 0 ]]; then
    echo "[phase10] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local output

  echo "[phase10] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[phase10] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[phase10] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[phase10] ${label} failed: SQL output unexpectedly contains ${unexpected}"
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

echo "[phase10] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[phase10] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[phase10] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[phase10] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
OWNER_USERNAME="p10o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p10m_${TS: -4}_$((RANDOM % 9000 + 1000))"
HOUSE_NAME="Phase 10 Screen Share House ${TS}"
VOICE_ROOM_NAME="voice-phase10"

register_user "${OWNER_CONFIG}" "${OWNER_USERNAME}" "${PASSWORD}"
register_user "${MEMBER_CONFIG}" "${MEMBER_USERNAME}" "${PASSWORD}"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 10 test house" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[phase10] failed: could not resolve house id"
  exit 1
fi

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
    | rg -o '"[A-Z0-9]{6,12}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[phase10] failed: could not resolve invite code"
  exit 1
fi

run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

OWNER_USER_ID="$(resolve_user_id "${OWNER_USERNAME}")"
MEMBER_USER_ID="$(resolve_user_id "${MEMBER_USERNAME}")"
if [[ -z "${OWNER_USER_ID}" || -z "${MEMBER_USER_ID}" ]]; then
  echo "[phase10] failed: could not resolve user ids"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "${VOICE_ROOM_NAME}" "voice" "Phase 10 voice room" null null
VOICE_ROOM_ID="$(
  run_sql "${DATABASE_NAME}" "select id from rooms where house_id = '${HOUSE_ID}' and name = '${VOICE_ROOM_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${VOICE_ROOM_ID}" ]]; then
  echo "[phase10] failed: could not resolve voice room id"
  exit 1
fi

echo "[phase10] screen share start/stop lifecycle"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_join_room "${VOICE_ROOM_ID}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_start_screen_share
expect_sql_contains \
  "screen share row created" \
  "select room_id from screen_shares where user_id = '${OWNER_USER_ID}'" \
  "${VOICE_ROOM_ID}"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_stop_screen_share
expect_sql_not_contains \
  "screen share row cleared on stop" \
  "select * from screen_shares where user_id = '${OWNER_USER_ID}'" \
  "${OWNER_USER_ID}"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_start_screen_share
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_leave_room
expect_sql_not_contains \
  "screen share row cleared on leave" \
  "select * from screen_shares where user_id = '${OWNER_USER_ID}'" \
  "${OWNER_USER_ID}"

echo "[phase10] permission denial for SHARE_SCREEN"
DEFAULT_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and is_default = true" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${DEFAULT_ROLE_ID}" ]]; then
  echo "[phase10] failed: could not resolve default role id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${VOICE_ROOM_ID}" "${DEFAULT_ROLE_ID}" "0" "${PERM_SHARE_SCREEN}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" voice_join_room "${VOICE_ROOM_ID}"
expect_call_failure \
  "member cannot start screen share when SHARE_SCREEN denied" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  voice_start_screen_share
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${VOICE_ROOM_ID}" "${DEFAULT_ROLE_ID}" "0" "0"

echo "[phase10] web build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[phase10] phase 10 screen share and layout acceptance checks passed"
