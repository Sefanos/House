#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

SPACETIME_SERVER="http://localhost:3000"
DATABASE_NAME="houseplan"

echo "[schema-protocol] starting local infrastructure"
docker compose up -d

echo "[schema-protocol] waiting for SpacetimeDB"
spacetime server ping "${SPACETIME_SERVER}"

echo "[schema-protocol] building module"
pnpm --filter @houseplan/spacetime build

echo "[schema-protocol] publishing module"
pnpm spacetime:publish

echo "[schema-protocol] regenerating typed client"
pnpm spacetime:generate

echo "[schema-protocol] validating generated bindings exist"
test -f "packages/spacetime-client/src/generated/index.ts"
test -f "packages/spacetime-client/src/generated/types/reducers.ts"
test -f "packages/spacetime-client/src/generated/rooms_set_room_permission_override_reducer.ts"

echo "[schema-protocol] running compatibility typechecks"
pnpm --filter @houseplan/spacetime-client typecheck
pnpm --filter @houseplan/web typecheck

echo "[schema-protocol] validating key reducer names after regeneration"
if ! rg -F -q "rooms.setRoomPermissionOverride" "packages/spacetime-client/src/client.ts"; then
  echo "[schema-protocol] reducer contract validation failed: rooms.setRoomPermissionOverride missing"
  exit 1
fi

if ! rg -F -q "house.createInvite" "packages/spacetime-client/src/client.ts"; then
  echo "[schema-protocol] reducer contract validation failed: house.createInvite missing"
  exit 1
fi

echo "[schema-protocol] schema change protocol checks passed for ${DATABASE_NAME}"
