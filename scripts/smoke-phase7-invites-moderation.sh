#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase7-owner.XXXXXX.toml)"
MOD_CONFIG="$(mktemp /tmp/houseplan-phase7-mod.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase7-member.XXXXXX.toml)"
JOINER_CONFIG="$(mktemp /tmp/houseplan-phase7-joiner.XXXXXX.toml)"
LIMITED_CONFIG="$(mktemp /tmp/houseplan-phase7-limited.XXXXXX.toml)"
EXPIRED_CONFIG="$(mktemp /tmp/houseplan-phase7-expired.XXXXXX.toml)"
BANNED_CONFIG="$(mktemp /tmp/houseplan-phase7-banned.XXXXXX.toml)"
REVOKED_CONFIG="$(mktemp /tmp/houseplan-phase7-revoked.XXXXXX.toml)"

PERM_MANAGE_INVITES="8"
PERM_KICK_MEMBERS="16"
PERM_BAN_MEMBERS="32"

cleanup() {
  rm -f \
    "${OWNER_CONFIG}" \
    "${MOD_CONFIG}" \
    "${MEMBER_CONFIG}" \
    "${JOINER_CONFIG}" \
    "${LIMITED_CONFIG}" \
    "${EXPIRED_CONFIG}" \
    "${BANNED_CONFIG}" \
    "${REVOKED_CONFIG}"
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

  echo "[phase7] ${label} (expecting failure)"
  set +e
  local output
  output="$(run_call_as "${cli_config}" "$@" 2>&1)"
  local status=$?
  set -e
  echo "${output}"

  if [[ ${status} -eq 0 ]]; then
    echo "[phase7] ${label} failed: command unexpectedly succeeded."
    exit 1
  fi
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"
  local output

  echo "[phase7] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[phase7] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[phase7] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[phase7] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

latest_invite_code() {
  local house_id="$1"
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${house_id}'" \
    | rg -o '"[A-Z0-9]{6,12}"' \
    | tail -n1 \
    | tr -d '"'
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

echo "[phase7] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[phase7] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[phase7] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[phase7] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
OWNER_USERNAME="p7o_${TS: -4}_$((RANDOM % 9000 + 1000))"
MOD_USERNAME="p7m_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p7u_${TS: -4}_$((RANDOM % 9000 + 1000))"
JOINER_USERNAME="p7j_${TS: -4}_$((RANDOM % 9000 + 1000))"
LIMITED_USERNAME="p7l_${TS: -4}_$((RANDOM % 9000 + 1000))"
EXPIRED_USERNAME="p7e_${TS: -4}_$((RANDOM % 9000 + 1000))"
BANNED_USERNAME="p7b_${TS: -4}_$((RANDOM % 9000 + 1000))"
REVOKED_USERNAME="p7r_${TS: -4}_$((RANDOM % 9000 + 1000))"
HOUSE_NAME="Phase 7 Invite Moderation House"

register_user "${OWNER_CONFIG}" "${OWNER_USERNAME}" "${PASSWORD}"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 7 test house" "" false "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[phase7] failed: could not resolve house id"
  exit 1
fi

DEFAULT_INVITE_CODE="$(latest_invite_code "${HOUSE_ID}")"
if [[ -z "${DEFAULT_INVITE_CODE}" ]]; then
  echo "[phase7] failed: could not resolve default invite code"
  exit 1
fi

register_user "${MOD_CONFIG}" "${MOD_USERNAME}" "${PASSWORD}"
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${DEFAULT_INVITE_CODE}"

register_user "${MEMBER_CONFIG}" "${MEMBER_USERNAME}" "${PASSWORD}"
run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${DEFAULT_INVITE_CODE}"

MOD_USER_ID="$(resolve_user_id "${MOD_USERNAME}")"
MEMBER_USER_ID="$(resolve_user_id "${MEMBER_USERNAME}")"
if [[ -z "${MOD_USER_ID}" || -z "${MEMBER_USER_ID}" ]]; then
  echo "[phase7] failed: could not resolve core user ids"
  exit 1
fi

echo "[phase7] permission checks before role assignment"
expect_call_failure \
  "member cannot create invite without MANAGE_INVITES" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  house_create_invite \
  "${HOUSE_ID}" \
  0 \
  0

expect_call_failure \
  "member cannot kick without KICK_MEMBERS" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  house_kick_member \
  "${HOUSE_ID}" \
  "${MOD_USER_ID}"

expect_call_failure \
  "member cannot ban without BAN_MEMBERS" \
  "${MEMBER_CONFIG}" \
  "${DATABASE_NAME}" \
  house_ban_member \
  "${HOUSE_ID}" \
  "${MOD_USER_ID}" \
  "invalid attempt"

MOD_PERMS="$((PERM_MANAGE_INVITES + PERM_KICK_MEMBERS + PERM_BAN_MEMBERS))"
echo "[phase7] owner grants moderation permissions"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_create_role "${HOUSE_ID}" "moderator" "" null "${MOD_PERMS}"
MOD_ROLE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from roles where house_id = '${HOUSE_ID}' and name = 'moderator'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${MOD_ROLE_ID}" ]]; then
  echo "[phase7] failed: could not resolve moderator role id"
  exit 1
fi
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" roles_assign_role "${HOUSE_ID}" "${MOD_USER_ID}" "${MOD_ROLE_ID}"


echo "[phase7] invite max-use limit"
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_create_invite "${HOUSE_ID}" 1 0
LIMITED_INVITE_CODE="$(latest_invite_code "${HOUSE_ID}")"
if [[ -z "${LIMITED_INVITE_CODE}" ]]; then
  echo "[phase7] failed: could not resolve limited invite code"
  exit 1
fi

register_user "${JOINER_CONFIG}" "${JOINER_USERNAME}" "${PASSWORD}"
run_call_as "${JOINER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${LIMITED_INVITE_CODE}"

register_user "${LIMITED_CONFIG}" "${LIMITED_USERNAME}" "${PASSWORD}"
expect_call_failure \
  "invite max uses enforced" \
  "${LIMITED_CONFIG}" \
  "${DATABASE_NAME}" \
  house_join_by_invite \
  "${LIMITED_INVITE_CODE}"


echo "[phase7] invite expiration"
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_create_invite "${HOUSE_ID}" 0 1
EXPIRED_INVITE_CODE="$(latest_invite_code "${HOUSE_ID}")"
if [[ -z "${EXPIRED_INVITE_CODE}" ]]; then
  echo "[phase7] failed: could not resolve expired invite code"
  exit 1
fi

register_user "${EXPIRED_CONFIG}" "${EXPIRED_USERNAME}" "${PASSWORD}"
sleep 2
expect_call_failure \
  "expired invite cannot be used" \
  "${EXPIRED_CONFIG}" \
  "${DATABASE_NAME}" \
  house_join_by_invite \
  "${EXPIRED_INVITE_CODE}"


echo "[phase7] kick permission path after role assignment"
JOINER_USER_ID="$(resolve_user_id "${JOINER_USERNAME}")"
if [[ -z "${JOINER_USER_ID}" ]]; then
  echo "[phase7] failed: could not resolve joiner user id"
  exit 1
fi
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_kick_member "${HOUSE_ID}" "${JOINER_USER_ID}"
expect_sql_not_contains \
  "kicked member removed" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${JOINER_USER_ID}\""


echo "[phase7] ban + unban lifecycle"
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_create_invite "${HOUSE_ID}" 0 0
OPEN_INVITE_CODE="$(latest_invite_code "${HOUSE_ID}")"
if [[ -z "${OPEN_INVITE_CODE}" ]]; then
  echo "[phase7] failed: could not resolve open invite code"
  exit 1
fi

register_user "${BANNED_CONFIG}" "${BANNED_USERNAME}" "${PASSWORD}"
run_call_as "${BANNED_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${OPEN_INVITE_CODE}"
BANNED_USER_ID="$(resolve_user_id "${BANNED_USERNAME}")"
if [[ -z "${BANNED_USER_ID}" ]]; then
  echo "[phase7] failed: could not resolve banned user id"
  exit 1
fi

run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_ban_member "${HOUSE_ID}" "${BANNED_USER_ID}" "spam"
expect_sql_contains \
  "ban row persisted" \
  "select * from house_bans where house_id = '${HOUSE_ID}' and user_id = '${BANNED_USER_ID}'" \
  "spam"
expect_sql_not_contains \
  "banned user removed from membership" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${BANNED_USER_ID}\""
expect_call_failure \
  "banned user cannot rejoin by invite" \
  "${BANNED_CONFIG}" \
  "${DATABASE_NAME}" \
  house_join_by_invite \
  "${OPEN_INVITE_CODE}"

run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_unban_member "${HOUSE_ID}" "${BANNED_USER_ID}"
expect_sql_not_contains \
  "ban row removed on unban" \
  "select user_id from house_bans where house_id = '${HOUSE_ID}'" \
  "\"${BANNED_USER_ID}\""
run_call_as "${BANNED_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${OPEN_INVITE_CODE}"
expect_sql_contains \
  "user can rejoin after unban" \
  "select user_id from house_members where house_id = '${HOUSE_ID}'" \
  "\"${BANNED_USER_ID}\""


echo "[phase7] invite revocation"
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_create_invite "${HOUSE_ID}" 0 0
REVOKE_INVITE_CODE="$(latest_invite_code "${HOUSE_ID}")"
if [[ -z "${REVOKE_INVITE_CODE}" ]]; then
  echo "[phase7] failed: could not resolve revoke invite code"
  exit 1
fi
run_call_as "${MOD_CONFIG}" "${DATABASE_NAME}" house_revoke_invite "${HOUSE_ID}" "${REVOKE_INVITE_CODE}"
expect_sql_not_contains \
  "revoked invite removed" \
  "select code from invites where house_id = '${HOUSE_ID}'" \
  "\"${REVOKE_INVITE_CODE}\""

register_user "${REVOKED_CONFIG}" "${REVOKED_USERNAME}" "${PASSWORD}"
expect_call_failure \
  "revoked invite cannot be used" \
  "${REVOKED_CONFIG}" \
  "${DATABASE_NAME}" \
  house_join_by_invite \
  "${REVOKE_INVITE_CODE}"


echo "[phase7] web invites/moderation build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[phase7] phase 7 invites + moderation acceptance checks passed"
