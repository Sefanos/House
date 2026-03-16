#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase6-owner.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase6-member.XXXXXX.toml)"

PERM_MANAGE_ROOMS="4"
PERM_MANAGE_MESSAGES="4096"
PERM_SEND_MESSAGES="2048"
PERM_ADMINISTRATOR="1073741824"

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

  echo "[roles-phase6] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[roles-phase6] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_call_failure() {
  local label="$1"
  local cli_config="$2"
  shift 2

  echo "[roles-phase6] ${label} (expecting failure)"
  set +e
  local output
  output="$(run_call_as "${cli_config}" "$@" 2>&1)"
  local status=$?
  set -e
  echo "${output}"

  if [[ ${status} -eq 0 ]]; then
    echo "[roles-phase6] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi
}

echo "[roles-phase6] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[roles-phase6] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[roles-phase6] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[roles-phase6] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
OWNER_USERNAME="p6o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p6m_${TS: -4}_$((RANDOM % 9000 + 1000))"
PASSWORD="houseplan-pass-123"
HOUSE_NAME="Phase 6 Roles House"
ROOM_NAME="general"

echo "[roles-phase6] register owner ${OWNER_USERNAME}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_register "${OWNER_USERNAME}" "${PASSWORD}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" auth_assert_session
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 6 test house" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[roles-phase6] failed: could not resolve house id"
  exit 1
fi

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
    | rg -o '"[A-Z0-9]{6,12}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[roles-phase6] failed: could not resolve invite code"
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
  echo "[roles-phase6] failed: could not resolve room id"
  exit 1
fi

echo "[roles-phase6] register member ${MEMBER_USERNAME} and join"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_register "${MEMBER_USERNAME}" "${PASSWORD}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" auth_assert_session
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

MEMBER_USER_ID="$(
  run_sql "${DATABASE_NAME}" "select id from users where username = '${MEMBER_USERNAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${MEMBER_USER_ID}" ]]; then
  echo "[roles-phase6] failed: could not resolve member user id"
  exit 1
fi

echo "[roles-phase6] forbidden action checks before role assignment"
expect_call_failure \
  "member cannot create role without MANAGE_ROLES" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  roles_create_role \
  "${HOUSE_ID}" \
  "bad-role" \
  "" \
  null \
  "${PERM_MANAGE_ROOMS}"

expect_call_failure \
  "member cannot update room without MANAGE_ROOMS" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  rooms_update_room \
  "${ROOM_ID}" \
  "general-member-attempt" \
  "chat" \
  "Attempted update" \
  0 \
  0

echo "[roles-phase6] owner creates moderator role and assigns to member"
MOD_PERMS="$((PERM_MANAGE_ROOMS + PERM_MANAGE_MESSAGES))"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_create_role "${HOUSE_ID}" "moderator" "" null "${MOD_PERMS}"

MOD_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and name = 'moderator'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${MOD_ROLE_ID}" ]]; then
  echo "[roles-phase6] failed: could not resolve moderator role id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_assign_role "${HOUSE_ID}" "${MEMBER_USER_ID}" "${MOD_ROLE_ID}"
expect_sql_contains \
  "member role assignment persisted" \
  "select * from member_roles where house_id = '${HOUSE_ID}' and user_id = '${MEMBER_USER_ID}'" \
  "${MOD_ROLE_ID}"

echo "[roles-phase6] member can now manage rooms"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" rooms_update_room "${ROOM_ID}" "general-moderated" "chat" "Moderated room" 0 0
expect_sql_contains \
  "room update by moderator persisted" \
  "select * from rooms where id = '${ROOM_ID}'" \
  "general-moderated"

echo "[roles-phase6] deny override takes precedence"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${ROOM_ID}" "${MOD_ROLE_ID}" "0" "${PERM_MANAGE_ROOMS}"
expect_call_failure \
  "moderator denied MANAGE_ROOMS by override" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  rooms_update_room \
  "${ROOM_ID}" \
  "general-denied" \
  "chat" \
  "Denied room" \
  0 \
  0

echo "[roles-phase6] allow override restores capability when deny removed"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${ROOM_ID}" "${MOD_ROLE_ID}" "${PERM_MANAGE_ROOMS}" "0"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" rooms_update_room "${ROOM_ID}" "general-allowed" "chat" "Allowed room" 0 0
expect_sql_contains \
  "room update works after allow override" \
  "select * from rooms where id = '${ROOM_ID}'" \
  "general-allowed"

EVERYONE_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and is_default = true" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${EVERYONE_ROLE_ID}" ]]; then
  echo "[roles-phase6] failed: could not resolve @everyone role id"
  exit 1
fi

echo "[roles-phase6] everyone deny SEND_MESSAGES blocks member"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" rooms_set_room_permission_override "${ROOM_ID}" "${EVERYONE_ROLE_ID}" "0" "${PERM_SEND_MESSAGES}"
expect_call_failure \
  "member blocked from sending by deny override" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  messages_send_message \
  "${ROOM_ID}" \
  "blocked message" \
  "" \
  "[]"

echo "[roles-phase6] ADMINISTRATOR bypasses room overrides"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_create_role "${HOUSE_ID}" "admin" "" null "${PERM_ADMINISTRATOR}"
ADMIN_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and name = 'admin'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${ADMIN_ROLE_ID}" ]]; then
  echo "[roles-phase6] failed: could not resolve admin role id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_assign_role "${HOUSE_ID}" "${MEMBER_USER_ID}" "${ADMIN_ROLE_ID}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" messages_send_message "${ROOM_ID}" "admin bypass message" "" "[]"
expect_sql_contains \
  "message sent with ADMINISTRATOR bypass" \
  "select * from messages where room_id = '${ROOM_ID}'" \
  "admin bypass message"

echo "[roles-phase6] web role editor + permissions build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[roles-phase6] phase 6 roles + permissions acceptance checks passed"
