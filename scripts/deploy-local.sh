#!/usr/bin/env bash

set -Eeuo pipefail

SERVER_HOST="${SERVER_HOST:-dev.beas.in}"
SERVER_USER="${SERVER_USER:-deploy}"
SERVER_PORT="${SERVER_PORT:-22}"
SERVER_APP_DIR="${SERVER_APP_DIR:-/var/www/dev.beas.in/public_html/restaurant_project_beas}"
PM2_APP_NAME="${PM2_APP_NAME:-restaurant-backend}"
PM2_INSTANCES="${PM2_INSTANCES:-1}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
ARTIFACT_DIR="${ARTIFACT_DIR:-artifacts}"

log() {
  printf '[%s] %s\n' "$(date +'%H:%M:%S')" "$1" >&2
}

die() {
  log "ERROR: $1"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

resolve_release_id() {
  local git_sha
  git_sha="$(git rev-parse --short HEAD 2>/dev/null || printf 'manual')"
  printf '%s-%s' "$(date +%Y%m%d%H%M%S)" "$git_sha"
}

build_backend() {
  log "Installing backend dependencies"
  (
    cd backend
    npm ci
    npm run lint
    npm run typecheck
    npm run build
  )
}

package_backend() {
  local release_id=$1
  local artifact_path="$ARTIFACT_DIR/backend-${release_id}.tgz"

  mkdir -p "$ARTIFACT_DIR"
  rm -f "$artifact_path"

  log "Creating backend artifact $artifact_path"
  tar -C backend -czf "$artifact_path" dist package.json package-lock.json prisma ecosystem.config.cjs
  printf '%s' "$artifact_path"
}

latest_artifact() {
  ls -1t "$ARTIFACT_DIR"/backend-*.tgz 2>/dev/null | head -n 1
}

deploy_artifact() {
  local release_id=$1
  local artifact_path=$2

  [[ -f "$artifact_path" ]] || die "Artifact not found: $artifact_path"

  log "Preparing remote directories"
  ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "mkdir -p '$SERVER_APP_DIR/incoming' '$SERVER_APP_DIR/shared' '$SERVER_APP_DIR/releases'"

  log "Uploading artifact and deploy script"
  scp -P "$SERVER_PORT" "$artifact_path" scripts/deploy.sh "$SERVER_USER@$SERVER_HOST:$SERVER_APP_DIR/incoming/"

  log "Running remote deployment"
  ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" \
    "APP_ROOT='$SERVER_APP_DIR' RELEASE_ID='$release_id' ARTIFACT_PATH='$SERVER_APP_DIR/incoming/$(basename "$artifact_path")' SHARED_ENV_FILE='$SERVER_APP_DIR/shared/backend.env' PM2_APP_NAME='$PM2_APP_NAME' PM2_INSTANCES='$PM2_INSTANCES' KEEP_RELEASES='$KEEP_RELEASES' bash '$SERVER_APP_DIR/incoming/deploy.sh'"
}

main() {
  require_cmd git
  require_cmd npm
  require_cmd tar
  require_cmd ssh
  require_cmd scp

  local mode="${1:-full}"
  local release_id
  local artifact_path

  case "$mode" in
    build)
      release_id="$(resolve_release_id)"
      build_backend
      artifact_path="$(package_backend "$release_id")"
      log "Artifact ready: $artifact_path"
      ;;
    deploy)
      artifact_path="$(latest_artifact)"
      [[ -n "$artifact_path" ]] || die "No backend artifact found in $ARTIFACT_DIR"
      release_id="$(basename "$artifact_path" .tgz)"
      release_id="${release_id#backend-}"
      deploy_artifact "$release_id" "$artifact_path"
      ;;
    full)
      release_id="$(resolve_release_id)"
      build_backend
      artifact_path="$(package_backend "$release_id")"
      deploy_artifact "$release_id" "$artifact_path"
      ;;
    *)
      die "Usage: $0 [build|deploy|full]"
      ;;
  esac
}

main "$@"
