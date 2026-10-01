#!/usr/bin/env bash
# ==============================================================================
# Universal Docker Build & Test Runner (Bash)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

DOCKERFILE_PATH="${REPO_ROOT}/docker/Dockerfile"
if [ ! -f "${DOCKERFILE_PATH}" ]; then
  DOCKERFILE_PATH="${REPO_ROOT}/Dockerfile"
fi

COMPOSE_FILE="${REPO_ROOT}/docker/docker-compose.yml"
if [ ! -f "${COMPOSE_FILE}" ]; then
  COMPOSE_FILE="${REPO_ROOT}/docker-compose.yml"
fi

echo "====================================================="
echo "  Building Application via Docker Container...       "
echo "  Repository Root: ${REPO_ROOT}                      "
echo "====================================================="

RUN_TESTS=false
EXPORT_BUILD=false
NO_CACHE=false
NO_PRUNE=false

for arg in "$@"; do
  case $arg in
    --test|-t)
      RUN_TESTS=true
      ;;
    --export|-e)
      EXPORT_BUILD=true
      ;;
    --no-cache)
      NO_CACHE=true
      ;;
    --no-prune)
      NO_PRUNE=true
      ;;
  esac
done

CACHE_FLAG=""
if [ "$NO_CACHE" = true ]; then
  CACHE_FLAG="--no-cache"
fi

if [ "$EXPORT_BUILD" = true ]; then
  echo "Exporting build artifacts to local directory..."
  docker build -f "${DOCKERFILE_PATH}" --target export --output type=local,dest=. ${CACHE_FLAG} .
else
  echo "Building development image..."
  docker build -f "${DOCKERFILE_PATH}" --target development -t app:dev ${CACHE_FLAG} .
fi

if [ "$RUN_TESTS" = true ]; then
  echo "Running automated tests inside container..."
  docker compose -f "${COMPOSE_FILE}" run --rm test
fi

if [ "$NO_PRUNE" = false ]; then
  echo "Automatically cleaning up dangling build layers..."
  docker image prune --filter "dangling=true" -f
fi

echo "Docker operation completed successfully!"
