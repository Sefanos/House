#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "[smoke] starting local infrastructure"
docker compose up -d

echo "[smoke] waiting for SpacetimeDB"
spacetime server ping http://localhost:3000

echo "[smoke] building spacetime module"
pnpm --filter @houseplan/spacetime build

echo "[smoke] publishing spacetime module"
pnpm spacetime:publish

echo "[smoke] generating spacetime TypeScript client"
pnpm spacetime:generate

echo "[smoke] building web app"
pnpm --filter @houseplan/web build

echo "[smoke] bootstrap flow succeeded"
