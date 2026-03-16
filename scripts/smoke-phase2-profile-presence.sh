#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

USERNAME="phase2_$(date +%s)_${RANDOM}"
PASSWORD="houseplan-pass-123"
DISPLAY_NAME="Phase Two User"
BIO="Profile persistence check for phase 2."
AVATAR_URL="https://cdn.example/phase2-avatar.png"

run_call() {
  spacetime call --server "${SPACETIME_SERVER}" "$@"
}

run_sql() {
  spacetime sql --server "${SPACETIME_SERVER}" "$@"
}

expect_sql_contains() {
  local label="$1"
  local query="$2"
  local expected="$3"

  echo "[profile-phase2] ${label}"
  local output
  output="$(run_sql "${DATABASE_NAME}" "${query}")"
  echo "${output}"

  if ! echo "${output}" | rg -F -q "${expected}"; then
    echo "[profile-phase2] ${label} failed: expected SQL output to contain: ${expected}"
    exit 1
  fi
}

assert_presence_state() {
  local status="$1"
  local custom_text="$2"

  echo "[profile-phase2] update status -> ${status}"
  run_call "${DATABASE_NAME}" user_update_status "${status}" "${custom_text}"

  expect_sql_contains \
    "presence state is ${status}" \
    "select status, custom_text from presence" \
    "\"${status}\""

  expect_sql_contains \
    "presence custom text for ${status}" \
    "select status, custom_text from presence" \
    "\"${custom_text}\""
}

echo "[profile-phase2] resetting local infrastructure"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d

echo "[profile-phase2] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[profile-phase2] building and publishing spacetime module"
pnpm --filter @houseplan/spacetime build
pnpm spacetime:publish

echo "[profile-phase2] regenerating spacetime TypeScript bindings"
pnpm spacetime:generate

echo "[profile-phase2] registering phase 2 user: ${USERNAME}"
run_call "${DATABASE_NAME}" auth_register "${USERNAME}" "${PASSWORD}"
run_call "${DATABASE_NAME}" auth_assert_session

expect_sql_contains \
  "initial presence is online after register" \
  "select status, custom_text from presence" \
  "\"online\""

SUB_OUTPUT="$(mktemp)"
echo "[profile-phase2] starting users subscription capture"
(
  spacetime subscribe \
    --server "${SPACETIME_SERVER}" \
    --print-initial-update \
    --timeout 8 \
    "${DATABASE_NAME}" \
    "select * from users" >"${SUB_OUTPUT}" 2>&1
) &
SUB_PID=$!

sleep 2

echo "[profile-phase2] updating profile values"
run_call "${DATABASE_NAME}" user_update_profile "${DISPLAY_NAME}" "${BIO}" "${AVATAR_URL}"
wait "${SUB_PID}" || true

cat "${SUB_OUTPUT}"
if ! rg -F -q "\"display_name\":{\"some\":\"${DISPLAY_NAME}\"}" "${SUB_OUTPUT}"; then
  echo "[profile-phase2] subscription reflection failed: updated display_name not seen in subscription."
  exit 1
fi

if ! rg -F -q "\"bio\":{\"some\":\"${BIO}\"}" "${SUB_OUTPUT}"; then
  echo "[profile-phase2] subscription reflection failed: updated bio not seen in subscription."
  exit 1
fi

if ! rg -F -q "\"avatar_url\":{\"some\":\"${AVATAR_URL}\"}" "${SUB_OUTPUT}"; then
  echo "[profile-phase2] subscription reflection failed: updated avatar_url not seen in subscription."
  exit 1
fi

expect_sql_contains \
  "profile persisted in users table (display name)" \
  "select username, display_name, bio, avatar_url from users where username = '${USERNAME}'" \
  "(some = \"${DISPLAY_NAME}\")"

expect_sql_contains \
  "profile persisted in users table (bio)" \
  "select username, display_name, bio, avatar_url from users where username = '${USERNAME}'" \
  "(some = \"${BIO}\")"

expect_sql_contains \
  "profile persisted in users table (avatar)" \
  "select username, display_name, bio, avatar_url from users where username = '${USERNAME}'" \
  "(some = \"${AVATAR_URL}\")"

assert_presence_state "idle" "idle focus"
assert_presence_state "dnd" "deep work"
assert_presence_state "offline" "away"
assert_presence_state "online" "back online"

echo "[profile-phase2] phase 2 profile + presence acceptance checks passed"
