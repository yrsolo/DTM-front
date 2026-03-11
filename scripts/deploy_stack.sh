#!/usr/bin/env bash
set -euo pipefail

TARGET="test"
DRY_RUN=false
RELEASE_ID=""
SKIP_FRONTEND=false
SKIP_AUTH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --release-id)
      RELEASE_ID="${2:-}"
      shift 2
      ;;
    --skip-frontend)
      SKIP_FRONTEND=true
      shift
      ;;
    --skip-auth)
      SKIP_AUTH=true
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$TARGET" in
  test|prod) ;;
  *)
    echo "Unsupported target: $TARGET" >&2
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"
FRONTEND_DEPLOY_CONFIG="$REPO_ROOT/scripts/deploy.yaml"

if [[ "$TARGET" == "prod" ]]; then
  if [[ -f "$REPO_ROOT/.env.prod" ]]; then
    ENV_FILE="$REPO_ROOT/.env.prod"
  fi
  FRONTEND_DEPLOY_CONFIG="$REPO_ROOT/scripts/deploy.prod.yaml"
fi

echo "Combined deploy target: $TARGET"
echo "Env file: $ENV_FILE"
echo "Frontend deploy config: $FRONTEND_DEPLOY_CONFIG"
echo "Dry-run: $DRY_RUN"
echo "Skip frontend: $SKIP_FRONTEND"
echo "Skip auth: $SKIP_AUTH"

if [[ "$SKIP_FRONTEND" != "true" ]]; then
  echo
  echo "=== Frontend deploy ==="
  FRONTEND_ARGS=(--target "$TARGET")
  if [[ "$DRY_RUN" == "true" ]]; then
    FRONTEND_ARGS+=(--dry-run)
  fi
  if [[ -n "$RELEASE_ID" ]]; then
    FRONTEND_ARGS+=(--release-id "$RELEASE_ID")
  fi
  DTM_WEB_PUBLIC_CONFIG_PATH="" "$SCRIPT_DIR/deploy_frontend.sh" "${FRONTEND_ARGS[@]}"
fi

if [[ "$SKIP_AUTH" != "true" ]]; then
  echo
  echo "=== Auth deploy ==="
  AUTH_ARGS=(--target "$TARGET")
  if [[ "$DRY_RUN" == "true" ]]; then
    AUTH_ARGS+=(--dry-run)
  fi
  "$SCRIPT_DIR/deploy_auth_function.sh" "${AUTH_ARGS[@]}"
fi

echo
echo "Combined deploy finished successfully."
