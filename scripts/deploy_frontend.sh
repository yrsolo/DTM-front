#!/usr/bin/env bash
set -euo pipefail

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
require_cmd aws

require_env YC_BUCKET_NAME
require_env YC_ENDPOINT
require_env AWS_ACCESS_KEY_ID
require_env AWS_SECRET_ACCESS_KEY
require_env AWS_DEFAULT_REGION

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Runtime config file not found: $CONFIG_PATH"
  exit 1
fi

echo "Checking AWS CLI..."
aws --version >/dev/null

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

echo "Uploading runtime config to /config/public.yaml ..."
aws s3 cp \
  "$CONFIG_PATH" \
  "$BUCKET_URI/config/public.yaml" \
  --endpoint-url "$YC_ENDPOINT" \
  --content-type "text/yaml" \
  --cache-control "no-cache"

if [[ -f "$REPO_ROOT/data/snapshot.example.json" ]]; then
  echo "Uploading fallback snapshot to /data/snapshot.example.json ..."
  aws s3 cp \
    "$REPO_ROOT/data/snapshot.example.json" \
    "$BUCKET_URI/data/snapshot.example.json" \
    --endpoint-url "$YC_ENDPOINT" \
    --content-type "application/json" \
    --cache-control "no-cache"
fi

echo "Syncing dist assets (excluding index.html) ..."
aws s3 sync \
  "$DIST_DIR" \
  "$BUCKET_URI" \
  --delete \
  --exclude "index.html" \
  --endpoint-url "$YC_ENDPOINT" \
  --cache-control "public, max-age=31536000, immutable"

echo "Uploading index.html with no-cache ..."
aws s3 cp \
  "$DIST_DIR/index.html" \
  "$BUCKET_URI/index.html" \
  --endpoint-url "$YC_ENDPOINT" \
  --content-type "text/html; charset=utf-8" \
  --cache-control "no-cache"

echo
echo "Deploy complete."
echo "Bucket: $YC_BUCKET_NAME"
echo "Open endpoint in Yandex Cloud Console:"
echo "Object Storage -> $YC_BUCKET_NAME -> Website hosting -> Endpoint"
echo "Typical format: https://<bucket>.website.yandexcloud.net"
