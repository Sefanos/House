#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"
PERM_CONNECT_VOICE="1048576"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase9-owner.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase9-member.XXXXXX.toml)"
WEB_LOG="$(mktemp /tmp/houseplan-phase9-web.XXXXXX.log)"
INVALID_TOKEN_RESPONSE_FILE="$(mktemp /tmp/houseplan-phase9-invalid-token.XXXXXX.json)"
WEB_PID=""

cleanup() {
  if [[ -n "${WEB_PID}" ]]; then
    kill "${WEB_PID}" >/dev/null 2>&1 || true
    wait "${WEB_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${OWNER_CONFIG}" "${MEMBER_CONFIG}" "${WEB_LOG}" "${INVALID_TOKEN_RESPONSE_FILE}"
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

  echo "[phase9] ${label} (expecting failure)"
  set +e
  local output
  output="$(run_call_as "${cli_config}" "$@" 2>&1)"
  local status=$?
  set -e
  echo "${output}"

  if [[ ${status} -eq 0 ]]; then
    echo "[phase9] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local output

  echo "[phase9] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[phase9] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_matches() {
  local label="$1"
  local query="$2"
  local pattern="$3"
  local output

  echo "[phase9] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -q "${pattern}"; then
    echo "[phase9] ${label} failed: expected SQL output to match regex ${pattern}"
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

start_web_server() {
  echo "[phase9] building web app"
  pnpm --filter @houseplan/web build >/dev/null

  echo "[phase9] starting web app"
  pnpm --filter @houseplan/web start >"${WEB_LOG}" 2>&1 &
  WEB_PID=$!

  for _ in {1..60}; do
    if curl -fsS "http://localhost:3001/api/health" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done

  echo "[phase9] web app did not become ready."
  tail -n 200 "${WEB_LOG}" || true
  exit 1
}

echo "[phase9] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[phase9] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[phase9] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[phase9] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
OWNER_USERNAME="p9o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p9m_${TS: -4}_$((RANDOM % 9000 + 1000))"
HOUSE_NAME="Phase 9 Voice House ${TS}"
VOICE_ROOM_NAME="voice-phase9"

register_user "${OWNER_CONFIG}" "${OWNER_USERNAME}" "${PASSWORD}"
register_user "${MEMBER_CONFIG}" "${MEMBER_USERNAME}" "${PASSWORD}"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 9 test house" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[phase9] failed: could not resolve house id"
  exit 1
fi

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
    | rg -o '"[A-Z0-9]{6,12}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[phase9] failed: could not resolve invite code"
  exit 1
fi

run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

OWNER_USER_ID="$(resolve_user_id "${OWNER_USERNAME}")"
MEMBER_USER_ID="$(resolve_user_id "${MEMBER_USERNAME}")"
if [[ -z "${OWNER_USER_ID}" || -z "${MEMBER_USER_ID}" ]]; then
  echo "[phase9] failed: could not resolve user ids"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "${VOICE_ROOM_NAME}" "voice" "Phase 9 voice room" null null
VOICE_ROOM_ID="$(
  run_sql "${DATABASE_NAME}" "select id from rooms where house_id = '${HOUSE_ID}' and name = '${VOICE_ROOM_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${VOICE_ROOM_ID}" ]]; then
  echo "[phase9] failed: could not resolve voice room id"
  exit 1
fi

echo "[phase9] owner joins voice room and updates media state"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_join_room "${VOICE_ROOM_ID}"
expect_sql_contains \
  "owner presence reflects voice room membership" \
  "select current_room_id from presence where user_id = '${OWNER_USER_ID}'" \
  "${VOICE_ROOM_ID}"
expect_sql_matches \
  "owner voice state defaults to muted camera off" \
  "select muted, camera_on from voice_states where user_id = '${OWNER_USER_ID}'" \
  "true\\s*\\|\\s*false"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_update_media_state false true
expect_sql_matches \
  "owner media state updates persisted" \
  "select muted, camera_on from voice_states where user_id = '${OWNER_USER_ID}'" \
  "false\\s*\\|\\s*true"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" voice_leave_room
expect_sql_contains \
  "owner leave clears current room" \
  "select current_room_id from presence where user_id = '${OWNER_USER_ID}'" \
  "\"\""

DEFAULT_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and is_default = true" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${DEFAULT_ROLE_ID}" ]]; then
  echo "[phase9] failed: could not resolve default role id"
  exit 1
fi

echo "[phase9] room override denies CONNECT_VOICE for non-owner members"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${VOICE_ROOM_ID}" "${DEFAULT_ROLE_ID}" "0" "${PERM_CONNECT_VOICE}"
expect_call_failure \
  "member cannot join voice room when CONNECT_VOICE is denied" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  voice_join_room \
  "${VOICE_ROOM_ID}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${VOICE_ROOM_ID}" "${DEFAULT_ROLE_ID}" "0" "0"

echo "[phase9] web livekit token endpoint checks"
start_web_server

INVALID_STATUS="$(
  curl -sS -o "${INVALID_TOKEN_RESPONSE_FILE}" -w "%{http_code}" \
    -X POST \
    -H "content-type: application/json" \
    -d '{}' \
    "http://localhost:3001/api/livekit/token"
)"
cat "${INVALID_TOKEN_RESPONSE_FILE}"
if [[ "${INVALID_STATUS}" != "400" ]]; then
  echo "[phase9] expected invalid token request to return HTTP 400, got ${INVALID_STATUS}"
  exit 1
fi

TOKEN_RESPONSE="$(
  curl -sS \
    -X POST \
    -H "content-type: application/json" \
    -d "{\"roomId\":\"${VOICE_ROOM_ID}\",\"roomName\":\"${VOICE_ROOM_NAME}\",\"identity\":\"${OWNER_USER_ID}\",\"name\":\"${OWNER_USERNAME}\"}" \
    "http://localhost:3001/api/livekit/token"
)"
echo "${TOKEN_RESPONSE}"
if ! echo "${TOKEN_RESPONSE}" | rg -F -q '"ok":true'; then
  echo "[phase9] livekit token response missing ok=true"
  exit 1
fi
if ! echo "${TOKEN_RESPONSE}" | rg -F -q "\"identity\":\"${OWNER_USER_ID}\""; then
  echo "[phase9] livekit token response identity mismatch"
  exit 1
fi

TOKEN_VALUE="$(
  echo "${TOKEN_RESPONSE}" \
    | rg -o '"token":"[^"]+"' \
    | sed 's/"token":"//;s/"$//'
)"
if [[ -z "${TOKEN_VALUE}" ]]; then
  echo "[phase9] failed: no token in response"
  exit 1
fi
if [[ "$(echo "${TOKEN_VALUE}" | awk -F'.' '{print NF}')" -ne 3 ]]; then
  echo "[phase9] failed: token is not a JWT"
  exit 1
fi

echo "[phase9] phase 9 voice acceptance checks passed"
