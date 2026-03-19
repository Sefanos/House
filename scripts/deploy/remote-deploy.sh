#!/usr/bin/env bash
set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/opt/houseplan}"

read_env_var() {
  local var_name="$1"
  local env_file="$2"
  grep -E "^${var_name}=" "${env_file}" | head -n 1 | cut -d= -f2-
}

ENV_FILE="${DEPLOY_ROOT}/.env"

GHCR_USERNAME="${GHCR_USERNAME:-}"
GHCR_TOKEN="${GHCR_TOKEN:-}"

if [ -z "${GHCR_USERNAME}" ] && [ -f "${ENV_FILE}" ]; then
  GHCR_USERNAME="$(read_env_var GHCR_USERNAME "${ENV_FILE}")"
fi

if [ -z "${GHCR_TOKEN}" ] && [ -f "${ENV_FILE}" ]; then
  GHCR_TOKEN="$(read_env_var GHCR_TOKEN "${ENV_FILE}")"
fi

required_vars=(
  GHCR_USERNAME
  GHCR_TOKEN
)

for var_name in "${required_vars[@]}"; do
  if [ -z "${!var_name:-}" ]; then
    echo "Missing required variable: ${var_name}" >&2
    exit 1
  fi
done

cd "${DEPLOY_ROOT}"

mkdir -p infra/livekit scripts/deploy traefik
touch traefik/acme.json
chmod 600 traefik/acme.json

echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USERNAME}" --password-stdin

docker compose --profile jobs -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d traefik redis spacetimedb livekit web
docker compose --profile jobs -f docker-compose.prod.yml run --rm spacetime-publisher
docker compose -f docker-compose.prod.yml ps
