#!/usr/bin/env bash
set -euo pipefail

SPACETIME_SERVER_URL="${SPACETIME_SERVER_URL:-http://spacetimedb:3000}"
SPACETIME_MODULE_NAME="${SPACETIME_MODULE_NAME:-houseplan}"

echo "[publish] waiting for SpacetimeDB at ${SPACETIME_SERVER_URL}"
for attempt in $(seq 1 30); do
  if spacetime server ping "${SPACETIME_SERVER_URL}" >/dev/null 2>&1; then
    break
  fi

  if [ "${attempt}" -eq 30 ]; then
    echo "[publish] SpacetimeDB did not become ready in time" >&2
    exit 1
  fi

  sleep 2
done

echo "[publish] building module"
pnpm --filter @houseplan/spacetime build

echo "[publish] publishing module ${SPACETIME_MODULE_NAME}"
spacetime publish "${SPACETIME_MODULE_NAME}" \
  --server "${SPACETIME_SERVER_URL}" \
  --module-path /app/apps/spacetime \
  --yes
