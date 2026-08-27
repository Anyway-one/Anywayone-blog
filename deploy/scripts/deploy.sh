#!/usr/bin/env bash

set -Eeuo pipefail

readonly DEPLOY_DIR="/opt/anywayone"
readonly STATE_FILE="${DEPLOY_DIR}/.deployed-image-tag"
readonly LOCK_FILE="${DEPLOY_DIR}/.deploy.lock"

cd "${DEPLOY_DIR}"

: "${IMAGE_TAG:?IMAGE_TAG must be set to an immutable image tag}"

if [[ ! -f .env || ! -f backend.env ]]; then
  echo "Missing ${DEPLOY_DIR}/.env or ${DEPLOY_DIR}/backend.env." >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another deployment is already running." >&2
  exit 1
fi

previous_tag=""
if [[ -f "${STATE_FILE}" ]]; then
  previous_tag="$(<"${STATE_FILE}")"
fi

rollback() {
  trap - ERR

  if [[ -z "${previous_tag}" ]]; then
    echo "Deployment failed and no previous image tag is available." >&2
    return
  fi

  echo "Deployment failed; restoring application images tagged ${previous_tag}." >&2
  IMAGE_TAG="${previous_tag}" docker compose up -d --remove-orphans --wait --wait-timeout 180
}

trap rollback ERR

export IMAGE_TAG

docker compose config --quiet
docker compose pull caddy web admin backend
docker compose run --rm --no-deps caddy caddy validate --config /etc/caddy/Caddyfile
docker compose run --rm --no-deps backend alembic upgrade head
docker compose up -d --remove-orphans --wait --wait-timeout 180

check_url() {
  local url="$1"
  local attempts=30

  until curl --fail --silent --show-error --output /dev/null "${url}"; do
    attempts=$((attempts - 1))
    if (( attempts == 0 )); then
      echo "Health check failed: ${url}" >&2
      return 1
    fi
    sleep 4
  done
}

check_url "https://www.anywayone.com/"
check_url "https://admin.anywayone.com/login"
check_url "https://api.anywayone.com/health/ready"

printf '%s\n' "${IMAGE_TAG}" >"${STATE_FILE}"
trap - ERR

docker image prune --force --filter "until=168h" >/dev/null
docker compose ps

echo "Deployment completed: ${IMAGE_TAG}"
