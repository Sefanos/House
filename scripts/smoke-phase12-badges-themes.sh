#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

OWNER_CONFIG="$(mktemp /tmp/houseplan-phase12-owner.XXXXXX.toml)"
MEMBER_CONFIG="$(mktemp /tmp/houseplan-phase12-member.XXXXXX.toml)"

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

  echo "[phase12] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[phase12] ${label} failed: expected SQL output to contain ${expected}"
    exit 1
  fi
}

expect_sql_not_contains() {
  local label="$1"
  local query="$2"
  local unexpected="$3"
  local output

  echo "[phase12] ${label}"
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"
  if echo "${output}" | rg -F -q "${unexpected}"; then
    echo "[phase12] ${label} failed: SQL output unexpectedly contains ${unexpected}"
    exit 1
  fi
}

expect_source_contains() {
  local label="$1"
  local file="$2"
  local expected="$3"

  echo "[phase12] ${label}"
  if ! rg -F -q "${expected}" "${file}"; then
    echo "[phase12] ${label} failed: expected '${expected}' in ${file}"
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

resolve_user_id() {
  local username="$1"
  run_sql "${DATABASE_NAME}" "select id from users where username = '${username}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
}

echo "[phase12] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[phase12] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[phase12] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[phase12] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

TS="$(date +%s)"
PASSWORD="houseplan-pass-123"
OWNER_USERNAME="p12owner_${TS: -4}_$((RANDOM % 9000 + 1000))"
MEMBER_USERNAME="p12member_${TS: -4}_$((RANDOM % 9000 + 1000))"
HOUSE_NAME="Phase 12 House ${TS}"

register_user "${OWNER_CONFIG}" "${OWNER_USERNAME}" "${PASSWORD}"
register_user "${MEMBER_CONFIG}" "${MEMBER_USERNAME}" "${PASSWORD}"

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_create_house "${HOUSE_NAME}" "Phase 12 test house" "" true "default" "#38bdf8"

HOUSE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from houses where name = '${HOUSE_NAME}'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${HOUSE_ID}" ]]; then
  echo "[phase12] failed: could not resolve house id"
  exit 1
fi

INVITE_CODE="$(
  run_sql "${DATABASE_NAME}" "select code from invites where house_id = '${HOUSE_ID}'" \
    | rg -o '"[A-Z0-9]{6,12}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${INVITE_CODE}" ]]; then
  echo "[phase12] failed: could not resolve invite code"
  exit 1
fi

run_call_as "${MEMBER_CONFIG}" "${DATABASE_NAME}" house_join_by_invite "${INVITE_CODE}"

MEMBER_USER_ID="$(resolve_user_id "${MEMBER_USERNAME}")"
if [[ -z "${MEMBER_USER_ID}" ]]; then
  echo "[phase12] failed: could not resolve member user id"
  exit 1
fi

echo "[phase12] badge grant/revoke reducer checks"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" badges_grant_badge "${HOUSE_ID}" "${MEMBER_USER_ID}" "Founder" "⭐" "house"
expect_sql_contains \
  "badge row created" \
  "select name from badges where house_id = '${HOUSE_ID}' and name = 'Founder'" \
  "Founder"
expect_sql_contains \
  "user badge assignment created" \
  "select user_id from user_badges where house_id = '${HOUSE_ID}' and user_id = '${MEMBER_USER_ID}'" \
  "${MEMBER_USER_ID}"

BADGE_ID="$(
  run_sql "${DATABASE_NAME}" "select id from badges where house_id = '${HOUSE_ID}' and name = 'Founder'" \
    | rg -o '"[0-9a-f-]{36}"' \
    | head -n1 \
    | tr -d '"'
)"
if [[ -z "${BADGE_ID}" ]]; then
  echo "[phase12] failed: could not resolve badge id"
  exit 1
fi

run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" badges_revoke_badge "${HOUSE_ID}" "${MEMBER_USER_ID}" "${BADGE_ID}"
expect_sql_not_contains \
  "user badge assignment removed" \
  "select * from user_badges where house_id = '${HOUSE_ID}' and user_id = '${MEMBER_USER_ID}'" \
  "${MEMBER_USER_ID}"

echo "[phase12] house theme update checks"
run_call_as "${OWNER_CONFIG}" "${DATABASE_NAME}" house_update_house "${HOUSE_ID}" "${HOUSE_NAME}" "Phase 12 updated" "" true "ocean" "#22d3ee"
expect_sql_contains \
  "house theme id updated" \
  "select theme_id from houses where id = '${HOUSE_ID}'" \
  "ocean"
expect_sql_contains \
  "house accent color updated" \
  "select accent_color from houses where id = '${HOUSE_ID}'" \
  "#22d3ee"

echo "[phase12] theme precedence and preset behavior source checks"
expect_source_contains \
  "appearance settings includes house/user theme source toggle" \
  "apps/web/components/theme/AppearanceSettings.tsx" \
  "Use House Theme"
expect_source_contains \
  "theme resolver applies house source precedence" \
  "apps/web/lib/theme.ts" \
  "usesHouseTheme = input.themeSource === \"house\""
expect_source_contains \
  "room page maps preset to voice panel variant" \
  "apps/web/app/(app)/houses/[houseId]/rooms/[roomId]/page.tsx" \
  "resolvedTheme.voiceLayoutMode === \"bottom_bar\" ? \"bottomBar\" : \"main\""

echo "[phase12] web build check"
pnpm --filter @houseplan/web build >/dev/null

echo "[phase12] phase 12 badges/themes acceptance checks passed"
