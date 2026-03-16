#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"
OWNER_CONFIG="$(mktemp /tmp/houseplan-phase4-owner.XXXXXX.toml)"

cleanup() {
  rm -f "${OWNER_CONFIG}"
}
trap cleanup EXIT

run_call() {
  spacetime --config-path "${OWNER_CONFIG}" call --server "${SPACETIME_SERVER}" -y "$@"
}

run_sql() {
  spacetime sql --server "${SPACETIME_SERVER}" "$@"
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local output

  echo "[rooms-phase4] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[rooms-phase4] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_matches() {
  local label="$1"
  local query="$2"
  local pattern="$3"
  local output

  echo "[rooms-phase4] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -q "${pattern}"; then
    echo "[rooms-phase4] ${label} failed: expected SQL output to match regex ${pattern}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[rooms-phase4] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[rooms-phase4] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

echo "[rooms-phase4] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[rooms-phase4] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[rooms-phase4] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[rooms-phase4] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
OWNER_USERNAME="p4o_${TS: -4}_$((RANDOM % 9000 + 1000))"
PASSWORD="houseplan-pass-123"
HOUSE_NAME="Phase 4 Rooms House"

echo "[rooms-phase4] register owner identity ${OWNER_USERNAME}"
run_call "${DATABASE_NAME}" auth_register "${OWNER_USERNAME}" "${PASSWORD}"
run_call "${DATABASE_NAME}" auth_assert_session

echo "[rooms-phase4] create house"
run_call "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 4 house description" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[rooms-phase4] failed: could not resolve house id."
  exit 1
fi

echo "[rooms-phase4] create rooms with ordered positions"
run_call "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "general" "chat" "General discussion" null null
run_call "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "voice-lounge" "voice" "Voice lounge" null null
run_call "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "support" "chat" "Support desk" null null

expect_sql_contains \
  "general room exists" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'general'" \
  "\"general\""
expect_sql_matches \
  "general room default position is 0" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'general'" \
  "\\|\\s*0\\s*\\|\\s*0\\s*\\|"
expect_sql_contains \
  "voice room exists" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'voice-lounge'" \
  "\"voice-lounge\""
expect_sql_matches \
  "voice room default position is 100" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'voice-lounge'" \
  "\\|\\s*100\\s*\\|\\s*0\\s*\\|"
expect_sql_contains \
  "support room exists" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'support'" \
  "\"support\""
expect_sql_matches \
  "support room default position is 200" \
  "select * from rooms where house_id = '${HOUSE_ID}' and name = 'support'" \
  "\\|\\s*200\\s*\\|\\s*0\\s*\\|"

SUPPORT_ROOM_ID="$(
  run_sql "${DATABASE_NAME}" "select id from rooms where house_id = '${HOUSE_ID}' and name = 'support'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
VOICE_ROOM_ID="$(
  run_sql "${DATABASE_NAME}" "select id from rooms where house_id = '${HOUSE_ID}' and name = 'voice-lounge'" \
    | rg -o "\"[0-9a-f-]{36}\"" \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${SUPPORT_ROOM_ID}" || -z "${VOICE_ROOM_ID}" ]]; then
  echo "[rooms-phase4] failed: could not resolve room ids."
  exit 1
fi

echo "[rooms-phase4] update support room position and metadata"
run_call "${DATABASE_NAME}" rooms_update_room "${SUPPORT_ROOM_ID}" "support-updated" "chat" "Updated support desk" 99 2

expect_sql_contains \
  "room update persisted name" \
  "select * from rooms where id = '${SUPPORT_ROOM_ID}'" \
  "\"support-updated\""
expect_sql_matches \
  "room update persisted position" \
  "select * from rooms where id = '${SUPPORT_ROOM_ID}'" \
  "\\|\\s*99\\s*\\|\\s*2\\s*\\|"
expect_sql_matches \
  "room update persisted slowmode" \
  "select * from rooms where id = '${SUPPORT_ROOM_ID}'" \
  "\\|\\s*99\\s*\\|\\s*2\\s*\\|"

echo "[rooms-phase4] delete voice room"
run_call "${DATABASE_NAME}" rooms_delete_room "${VOICE_ROOM_ID}"

expect_sql_not_contains \
  "deleted room removed from rooms table" \
  "select * from rooms where house_id = '${HOUSE_ID}'" \
  "\"voice-lounge\""

echo "[rooms-phase4] web navigation shell build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[rooms-phase4] phase 4 rooms + navigation acceptance checks passed"
