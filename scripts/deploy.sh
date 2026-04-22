#!/usr/bin/env bash

set -Eeuo pipefail
umask 027

APP_ROOT="${APP_ROOT:-/var/www/dev.beas.in/public_html/restaurant_project_beas}"
SHARED_ENV_FILE="${SHARED_ENV_FILE:-$APP_ROOT/shared/backend.env}"
RELEASE_ID="${RELEASE_ID:-manual-$(date +%Y%m%d%H%M%S)}"
ARTIFACT_PATH="${ARTIFACT_PATH:-$APP_ROOT/incoming/backend-${RELEASE_ID}.tgz}"
PM2_APP_NAME="${PM2_APP_NAME:-restaurant-backend}"
PM2_INSTANCES="${PM2_INSTANCES:-1}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

RELEASES_DIR="$APP_ROOT/releases"
CURRENT_LINK="$APP_ROOT/current"
INCOMING_DIR="$APP_ROOT/incoming"
LOCK_DIR="$APP_ROOT/.deploy.lock"
NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
PREVIOUS_TARGET=""
DEPLOY_SUCCESS=0

log() {
  printf '[%s] %s\n' "$(date +'%Y-%m-%d %H:%M:%S')" "$1"
}

die() {
  log "ERROR: $1"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

read_port_from_env_file() {
  if [[ ! -f "$SHARED_ENV_FILE" ]]; then
    printf '4000'
    return
  fi

  local port
  port="$(awk -F= '/^[[:space:]]*PORT[[:space:]]*=/{gsub(/"/, "", $2); gsub(/[[:space:]]/, "", $2); print $2; exit}' "$SHARED_ENV_FILE")"
  printf '%s' "${port:-4000}"
}

HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://127.0.0.1:$(read_port_from_env_file)/api/health}"

rollback() {
  if [[ -z "$PREVIOUS_TARGET" || ! -d "$PREVIOUS_TARGET" ]]; then
    return
  fi

  log "Rolling back to $PREVIOUS_TARGET"
  ln -sfn "$PREVIOUS_TARGET" "$CURRENT_LINK"
  export NODE_ENV=production
  export PM2_ENV_FILE="$SHARED_ENV_FILE"
  export PM2_APP_NAME
  export PM2_INSTANCES
  pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --update-env --env production >/dev/null
  pm2 save >/dev/null
}

cleanup() {
  local exit_code=$?

  if [[ $exit_code -ne 0 ]]; then
    log "Deployment failed for release $RELEASE_ID"
    rollback || true
    rm -rf "$NEW_RELEASE_DIR" 2>/dev/null || true
    rm -rf "$LOCK_DIR" 2>/dev/null || true
    exit "$exit_code"
  fi

  if [[ $DEPLOY_SUCCESS -eq 1 ]]; then
    rm -f "$ARTIFACT_PATH" "$INCOMING_DIR/deploy.sh" 2>/dev/null || true
    log "Deployment finished for release $RELEASE_ID"
  fi

  rm -rf "$LOCK_DIR" 2>/dev/null || true
}

trap cleanup EXIT

require_cmd tar
require_cmd node
require_cmd npm
require_cmd pm2
require_cmd curl
require_cmd find
require_cmd awk

[[ "$KEEP_RELEASES" =~ ^[0-9]+$ ]] || die "KEEP_RELEASES must be numeric"
[[ -f "$SHARED_ENV_FILE" ]] || die "Missing env file: $SHARED_ENV_FILE"
[[ -f "$ARTIFACT_PATH" ]] || die "Missing artifact: $ARTIFACT_PATH"

mkdir -p "$APP_ROOT" "$RELEASES_DIR" "$INCOMING_DIR"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  die "Another deployment already running"
fi

if [[ -L "$CURRENT_LINK" || -d "$CURRENT_LINK" ]]; then
  PREVIOUS_TARGET="$(readlink -f "$CURRENT_LINK" || true)"
fi

[[ ! -e "$NEW_RELEASE_DIR" ]] || die "Release already exists: $NEW_RELEASE_DIR"

log "Extracting release artifact into $NEW_RELEASE_DIR"
mkdir -p "$NEW_RELEASE_DIR"
tar -xzf "$ARTIFACT_PATH" -C "$NEW_RELEASE_DIR"

cd "$NEW_RELEASE_DIR"

log "Installing locked dependencies"
npm ci

log "Generating Prisma client"
npm run prisma:generate

log "Applying Prisma migrations"
npm run prisma:migrate:deploy

log "Pruning dev dependencies"
npm prune --omit=dev

log "Switching current release"
ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_LINK"

export NODE_ENV=production
export PM2_ENV_FILE="$SHARED_ENV_FILE"
export PM2_APP_NAME
export PM2_INSTANCES

log "Reloading PM2 application"
pm2 startOrReload "$CURRENT_LINK/ecosystem.config.cjs" --update-env --env production
pm2 save >/dev/null

log "Running health check: $HEALTHCHECK_URL"
for attempt in $(seq 1 20); do
  if curl -fsS "$HEALTHCHECK_URL" >/dev/null; then
    DEPLOY_SUCCESS=1
    break
  fi

  sleep 3
  log "Health check retry $attempt/20"
done

[[ $DEPLOY_SUCCESS -eq 1 ]] || die "Health check failed after release switch"

log "Pruning old releases"
mapfile -t releases < <(find "$RELEASES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if (( ${#releases[@]} > KEEP_RELEASES )); then
  delete_count=$(( ${#releases[@]} - KEEP_RELEASES ))

  for ((index = 0; index < delete_count; index++)); do
    release_dir="${releases[$index]}"

    if [[ "$release_dir" == "$NEW_RELEASE_DIR" || "$release_dir" == "$PREVIOUS_TARGET" ]]; then
      continue
    fi

    rm -rf "$release_dir"
  done
fi
