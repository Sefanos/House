#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase5-owner.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase5-member.XXXXXX.toml)"

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
  local output

  echo "[chat-phase5] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[chat-phase5] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[chat-phase5] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[chat-phase5] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

expect_sql_matches() {
  local label="$1"
  local query="$2"
  local pattern="$3"
  local output

  echo "[chat-phase5] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -q "${pattern}"; then
    echo "[chat-phase5] ${label} failed: expected SQL output to match regex ${pattern}"
    exit 1
  fi
}

expect_failure_with_log() {
  local label="$1"
  local expected_message="$2"
  local cli_config="$3"
  shift 3

  echo "[chat-phase5] ${label} (expecting failure)"
  if run_call_as "${cli_config}" "$@"; then
    echo "[chat-phase5] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi

  if ! spacetime logs --server "${SPACETIME_SERVER}" "${DATABASE_NAME}" --num-lines 200 | rg -F -q "${expected_message}"; then
    echo "[chat-phase5] ${label} failed: expected log message not found: ${expected_message}"
    exit 1
  fi
}

echo "[chat-phase5] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[chat-phase5] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[chat-phase5] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[chat-phase5] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
OWNER_USERNAME="p5o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p5m_${TS: -4}_$((RANDOM % 9000 + 1000))"
PASSWORD="houseplan-pass-123"
HOUSE_NAME="Phase 5 Chat House"
ROOM_NAME="general-chat"

echo "[chat-phase5] register owner identity ${OWNER_USERNAME}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_register "${OWNER_USERNAME}" "${PASSWORD}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_assert_session

echo "[chat-phase5] create house and room"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 5 house" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
  | rg -o '"[0-9a-f-]{36}"' \
  | head -n1 \
  | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[chat-phase5] failed: could not resolve house id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_create_room "${HOUSE_ID}" "${ROOM_NAME}" "chat" "Main room" null null

ROOM_ID="$(
  run_sql "${DATABASE_NAME}" "select id from rooms where house_id = '${HOUSE_ID}' and name = '${ROOM_NAME}'" \
  | rg -o '"[0-9a-f-]{36}"' \
  | head -n1 \
  | tr -d '"'
)"
if [[ -z "${ROOM_ID}" ]]; then
  echo "[chat-phase5] failed: could not resolve room id"
  exit 1
fi

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
  | rg -o '"[A-Z0-9]{6,12}"' \
  | head -n1 \
  | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[chat-phase5] failed: could not resolve invite code"
  exit 1
fi

echo "[chat-phase5] register member identity ${MEMBER_USERNAME}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_register "${MEMBER_USERNAME}" "${PASSWORD}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_assert_session
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

echo "[chat-phase5] owner sends and edits a message"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" messages_send_message "${ROOM_ID}" "hello from owner" "" "[]"

ROOT_MESSAGE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from messages where room_id = '${ROOM_ID}' and content = 'hello from owner'" \
  | rg -o '"[0-9a-f-]{36}"' \
  | head -n1 \
  | tr -d '"'
)"
if [[ -z "${ROOT_MESSAGE_ID}" ]]; then
  echo "[chat-phase5] failed: could not resolve root message id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" messages_edit_message "${ROOT_MESSAGE_ID}" "hello from owner (edited)"
expect_sql_contains \
  "edited message content persisted" \
  "select * from messages where id = '${ROOT_MESSAGE_ID}'" \
  "hello from owner (edited)"

echo "[chat-phase5] reaction add/remove flow"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" messages_add_reaction "${ROOT_MESSAGE_ID}" "🔥"
expect_sql_contains \
  "reaction persisted" \
  "select * from reactions where message_id = '${ROOT_MESSAGE_ID}'" \
  "🔥"

run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" messages_remove_reaction "${ROOT_MESSAGE_ID}" "🔥"
expect_sql_not_contains \
  "reaction removed" \
  "select * from reactions where message_id = '${ROOT_MESSAGE_ID}'" \
  "🔥"

echo "[chat-phase5] thread reply flow"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" messages_send_message "${ROOM_ID}" "thread reply 1" "${ROOT_MESSAGE_ID}" "[]"
expect_sql_contains \
  "thread reply persisted" \
  "select * from messages where room_id = '${ROOM_ID}'" \
  "thread reply 1"
expect_sql_contains \
  "thread parent id persisted" \
  "select * from messages where content = 'thread reply 1'" \
  "${ROOT_MESSAGE_ID}"

expect_failure_with_log \
  "non-author member cannot delete owner message" \
  "Only the message author, house owner, or a manager can delete this message." \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  messages_delete_message \
  "${ROOT_MESSAGE_ID}"

echo "[chat-phase5] owner soft-deletes message"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" messages_delete_message "${ROOT_MESSAGE_ID}"
expect_sql_matches \
  "soft-delete keeps row with deleted_at timestamp" \
  "select * from messages where id = '${ROOT_MESSAGE_ID}'" \
  "\|\s*\"\"\s*\|\s*\"[0-9]{4}-[0-9]{2}-[0-9]{2}T"

echo "[chat-phase5] web chat build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[chat-phase5] phase 5 chat core acceptance checks passed"
