#!/usr/bin/env bash
set -euo pipefail

DRY_RUN=false
RELEASE_ID="${RELEASE_ID:-}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --release-id)
      RELEASE_ID="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

require_cmd() {
  local cmd="$1"
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "Required command '$cmd' not found in PATH."
    exit 1
  }
}

require_env() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    echo "Missing required environment variable: $name"
    exit 1
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WEB_DIR="$REPO_ROOT/apps/web"
DIST_DIR="$WEB_DIR/dist"
CONFIG_PATH="${DTM_WEB_PUBLIC_CONFIG_PATH:-$REPO_ROOT/apps/web/config/public.yaml}"
if [[ "$CONFIG_PATH" != /* ]]; then
  CONFIG_PATH="$REPO_ROOT/$CONFIG_PATH"
fi

require_cmd node
require_cmd npm
if [[ "$DRY_RUN" != "true" ]]; then
  require_cmd aws
fi

require_env YC_BUCKET_NAME
require_env YC_ENDPOINT
require_env AWS_DEFAULT_REGION
if [[ "$DRY_RUN" != "true" ]]; then
  require_env AWS_ACCESS_KEY_ID
  require_env AWS_SECRET_ACCESS_KEY
fi

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Runtime config file not found: $CONFIG_PATH"
  exit 1
fi

if [[ "$DRY_RUN" != "true" ]]; then
  echo "Checking AWS CLI..."
  aws --version >/dev/null
fi

echo "Installing frontend dependencies and building..."
pushd "$WEB_DIR" >/dev/null
if [[ -f "$WEB_DIR/package-lock.json" ]]; then
  npm ci
else
  npm install
fi
npm run build
popd >/dev/null

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Build output not found: $DIST_DIR"
  exit 1
fi

BUCKET_URI="s3://$YC_BUCKET_NAME"
if [[ -z "$RELEASE_ID" ]]; then
  DATE_PART="$(date -u +%Y%m%d-%H%M%S)"
  SHA_PART="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
  RELEASE_ID="$DATE_PART-$SHA_PART"
fi
RELEASE_PREFIX="$BUCKET_URI/releases/$RELEASE_ID"
LATEST_RELEASE_PATH="$BUCKET_URI/releases/latest.json"
TMP_RELEASE_FILE="$(mktemp)"
trap 'rm -f "$TMP_RELEASE_FILE"' EXIT

cat > "$TMP_RELEASE_FILE" <<EOF
{
  "release_id": "$RELEASE_ID",
  "generated_at_utc": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_ref": "${GITHUB_REF:-}",
  "git_sha": "${GITHUB_SHA:-}"
}
EOF

echo "Uploading runtime config to /config/public.yaml ..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] aws s3 cp \"$CONFIG_PATH\" \"$BUCKET_URI/config/public.yaml\" --endpoint-url \"$YC_ENDPOINT\" --content-type text/yaml --cache-control no-cache"
  echo "[DRY-RUN] aws s3 cp \"$CONFIG_PATH\" \"$BUCKET_URI/config/public.yam\" --endpoint-url \"$YC_ENDPOINT\" --content-type text/yaml --cache-control no-cache"
else
  aws s3 cp \
    "$CONFIG_PATH" \
    "$BUCKET_URI/config/public.yaml" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "text/yaml" \
    --cache-control "no-cache"
  aws s3 cp \
    "$CONFIG_PATH" \
    "$BUCKET_URI/config/public.yam" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "text/yaml" \
    --cache-control "no-cache"
fi

if [[ -f "$REPO_ROOT/data/snapshot.example.json" ]]; then
  echo "Uploading fallback snapshot to /data/snapshot.example.json ..."
  if [[ "$DRY_RUN" == "true" ]]; then
    echo "[DRY-RUN] aws s3 cp \"$REPO_ROOT/data/snapshot.example.json\" \"$BUCKET_URI/data/snapshot.example.json\" --endpoint-url \"$YC_ENDPOINT\" --content-type application/json --cache-control no-cache"
  else
    aws s3 cp \
      "$REPO_ROOT/data/snapshot.example.json" \
      "$BUCKET_URI/data/snapshot.example.json" \
      --endpoint-url "$YC_ENDPOINT" \
      --content-type "application/json" \
      --cache-control "no-cache"
  fi
fi

echo "Syncing dist assets (excluding index.html) ..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] aws s3 sync \"$DIST_DIR\" \"$BUCKET_URI\" --delete --exclude index.html --endpoint-url \"$YC_ENDPOINT\" --cache-control \"public, max-age=31536000, immutable\""
else
  aws s3 sync \
    "$DIST_DIR" \
    "$BUCKET_URI" \
    --delete \
    --exclude "index.html" \
    --endpoint-url "$YC_ENDPOINT" \
    --cache-control "public, max-age=31536000, immutable"
fi

echo "Uploading index.html with no-cache ..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] aws s3 cp \"$DIST_DIR/index.html\" \"$BUCKET_URI/index.html\" --endpoint-url \"$YC_ENDPOINT\" --content-type \"text/html; charset=utf-8\" --cache-control no-cache"
else
  aws s3 cp \
    "$DIST_DIR/index.html" \
    "$BUCKET_URI/index.html" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "text/html; charset=utf-8" \
    --cache-control "no-cache"
fi

echo "Uploading release metadata ..."
if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY-RUN] aws s3 cp \"$TMP_RELEASE_FILE\" \"$RELEASE_PREFIX/release.json\" --endpoint-url \"$YC_ENDPOINT\" --content-type application/json --cache-control no-cache"
  echo "[DRY-RUN] aws s3 cp \"$TMP_RELEASE_FILE\" \"$LATEST_RELEASE_PATH\" --endpoint-url \"$YC_ENDPOINT\" --content-type application/json --cache-control no-cache"
else
  aws s3 cp \
    "$TMP_RELEASE_FILE" \
    "$RELEASE_PREFIX/release.json" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "application/json" \
    --cache-control "no-cache"
  aws s3 cp \
    "$TMP_RELEASE_FILE" \
    "$LATEST_RELEASE_PATH" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "application/json" \
    --cache-control "no-cache"
fi

echo
if [[ "$DRY_RUN" == "true" ]]; then
  echo "Dry-run complete (no upload executed)."
else
  echo "Deploy complete."
fi
echo "Bucket: $YC_BUCKET_NAME"
echo "ReleaseId: $RELEASE_ID"
echo "Open endpoint in Yandex Cloud Console:"
echo "Object Storage -> $YC_BUCKET_NAME -> Website hosting -> Endpoint"
echo "Typical format: https://<bucket>.website.yandexcloud.net"
