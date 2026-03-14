#!/usr/bin/env bash
set -euo pipefail

TARGET="test"
DRY_RUN="false"

read_dotenv_value() {
  local key="$1"
  [[ -f .env ]] || return 0
  local line
  line="$(grep -m1 "^${key}=" .env || true)"
  [[ -n "$line" ]] || return 0
  printf '%s' "${line#*=}"
}

for env_name in YC_SA_JSON_CREDENTIALS AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY TG_TOKEN PEOPLE_SYNC_PATH; do
  if [[ -z "${!env_name:-}" ]]; then
    dotenv_value="$(read_dotenv_value "$env_name")"
    if [[ -n "$dotenv_value" ]]; then
      export "$env_name=$dotenv_value"
    fi
  fi
done

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --dry-run)
      DRY_RUN="true"
      shift 1
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 1
      ;;
  esac
done

if [[ "$TARGET" != "test" && "$TARGET" != "prod" ]]; then
  echo "Usage: scripts/deploy_auth_function.sh --target test|prod [--dry-run]" >&2
  exit 1
fi

CONFIG_JSON="$(node - <<'NODE'
const fs = require('fs');
const raw = fs.readFileSync('config/deploy.yaml', 'utf8');
const result = {};
let current = null;
for (const rawLine of raw.split(/\r?\n/)) {
  if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue;
  const m = rawLine.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
  if (!m) continue;
  const [, indent, key, value] = m;
  if (indent.length === 0) {
    result[key] = {};
    current = key;
  } else if (current) {
    result[current][key] = value.trim();
  }
}
process.stdout.write(JSON.stringify(result));
NODE
)"

folder_id="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.folder_id)")"
service_account_id="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.service_account_id)")"
function_entrypoint="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.function_entrypoint)")"
function_runtime="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.function_runtime)")"
function_timeout="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.function_timeout)")"
function_memory="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.function_memory)")"
lockbox_id="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.lockbox_id)")"
ydb_endpoint="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.ydb_endpoint)")"
api_origin_test="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.api_origin_test || '')")"
api_origin_prod="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.api_origin_prod || '')")"

if [[ "$TARGET" == "test" ]]; then
  function_name="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.auth_function_name_test)")"
  ydb_database="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.ydb_database_test)")"
  auth_base_path="/test/ops/auth"
  api_proxy_base_path="/test/ops/bff"
  api_upstream_origin="${api_origin_test%/}/api"
  oauth_client_id_env_name="YANDEX_CLIENT_ID_TEST"
  oauth_client_secret_env_name="YANDEX_CLIENT_SECRET_TEST"
else
  function_name="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.auth_function_name_prod)")"
  ydb_database="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.ydb_database_prod)")"
  auth_base_path="/ops/auth"
  api_proxy_base_path="/ops/bff"
  api_upstream_origin="${api_origin_prod%/}/api"
  oauth_client_id_env_name="YANDEX_CLIENT_ID_PROD"
  oauth_client_secret_env_name="YANDEX_CLIENT_SECRET_PROD"
fi

people_sync_path="${PEOPLE_SYNC_PATH:-/v2/people}"

oauth_client_id_value="${!oauth_client_id_env_name:-}"
oauth_client_secret_value="${!oauth_client_secret_env_name:-}"

if [[ -z "$api_upstream_origin" ]]; then
  echo "Missing api_origin for target=$TARGET in config/deploy.yaml" >&2
  exit 1
fi

npm run build --workspace @dtm/auth

if [[ "$DRY_RUN" == "true" ]]; then
  echo "target: $TARGET"
  echo "function: $function_name"
  echo "auth_base_path: $auth_base_path"
  echo "api_proxy_base_path: $api_proxy_base_path"
  echo "api_upstream_origin: $api_upstream_origin"
  echo "ydb_endpoint: $ydb_endpoint"
  echo "ydb_database: $ydb_database"
  echo "lockbox_id: $lockbox_id"
  echo "oauth_client_id_env: $oauth_client_id_env_name"
  echo "oauth_client_secret_env: $oauth_client_secret_env_name"
  echo "browser_auth_proxy_secret: lockbox:BROWSER_AUTH_PROXY_SECRET"
  echo "telegram_bot_token: ${TG_TOKEN:+provided}"
  echo "people_sync_path: $people_sync_path"
  echo "preset_bucket: dtm-presets"
  echo "preset_public_base_url: https://dtm-presets.website.yandexcloud.net"
  exit 0
fi

temp_dir=""
cleanup() {
  if [[ -n "$temp_dir" && -d "$temp_dir" ]]; then
    rm -rf "$temp_dir"
  fi
}
trap cleanup EXIT

if [[ -n "${YC_SA_JSON_CREDENTIALS:-}" ]]; then
  temp_dir="$(mktemp -d)"
  printf '%s' "$YC_SA_JSON_CREDENTIALS" > "$temp_dir/sa-key.json"
  export YC_CONFIG_DIR="$temp_dir/.config"
  yc config profile create auth-deploy >/dev/null 2>/dev/null || true
  yc config set service-account-key "$temp_dir/sa-key.json" >/dev/null
  yc config set folder-id "$folder_id" >/dev/null
fi

if ! yc serverless function get --name "$function_name" --format json >/dev/null 2>&1; then
  yc serverless function create --name "$function_name" --folder-id "$folder_id" >/dev/null
fi

secret_args=(
  --secret "id=$lockbox_id,key=SESSION_SIGNING_SECRET,environment-variable=SESSION_SIGNING_SECRET"
  --secret "id=$lockbox_id,key=COOKIE_NAME,environment-variable=COOKIE_NAME"
  --secret "id=$lockbox_id,key=COOKIE_PATH,environment-variable=COOKIE_PATH"
  --secret "id=$lockbox_id,key=COOKIE_SAMESITE,environment-variable=COOKIE_SAMESITE"
  --secret "id=$lockbox_id,key=COOKIE_SECURE,environment-variable=COOKIE_SECURE"
  --secret "id=$lockbox_id,key=SESSION_TTL_SECONDS,environment-variable=SESSION_TTL_SECONDS"
  --secret "id=$lockbox_id,key=BROWSER_AUTH_PROXY_SECRET,environment-variable=BROWSER_AUTH_PROXY_SECRET"
)

oauth_args=()
if [[ -n "$oauth_client_id_value" && -n "$oauth_client_secret_value" ]]; then
  oauth_args+=(
    --environment "$oauth_client_id_env_name=$oauth_client_id_value"
    --environment "$oauth_client_secret_env_name=$oauth_client_secret_value"
  )
else
  oauth_args+=(
    --secret "id=$lockbox_id,key=$oauth_client_id_env_name,environment-variable=$oauth_client_id_env_name"
    --secret "id=$lockbox_id,key=$oauth_client_secret_env_name,environment-variable=$oauth_client_secret_env_name"
  )
fi

env_args=(
  --environment "CONTOUR=$TARGET"
  --environment "BASE_URL=https://dtm.solofarm.ru"
  --environment "AUTH_BASE_PATH=$auth_base_path"
  --environment "API_PROXY_BASE_PATH=$api_proxy_base_path"
  --environment "API_UPSTREAM_ORIGIN=$api_upstream_origin"
  --environment "PEOPLE_SYNC_PATH=$people_sync_path"
  --environment "YDB_ENDPOINT=$ydb_endpoint"
  --environment "YDB_DATABASE=$ydb_database"
  --environment "YDB_METADATA_CREDENTIALS=1"
  --environment "PRESET_BUCKET=dtm-presets"
  --environment "PRESET_PUBLIC_BASE_URL=https://dtm-presets.website.yandexcloud.net"
  --environment "PRESET_STORAGE_ENDPOINT=https://storage.yandexcloud.net"
  --environment "PRESET_STORAGE_REGION=ru-central1"
)

if [[ -n "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  env_args+=(
    --environment "AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID"
    --environment "AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY"
  )
fi

if [[ -n "${TG_TOKEN:-}" ]]; then
  env_args+=(
    --environment "TG_TOKEN=$TG_TOKEN"
  )
fi

yc serverless function version create \
  --function-name "$function_name" \
  --runtime "$function_runtime" \
  --entrypoint "$function_entrypoint" \
  --memory "$function_memory" \
  --execution-timeout "$function_timeout" \
  --service-account-id "$service_account_id" \
  --source-path "apps/auth/dist" \
  "${env_args[@]}" \
  "${secret_args[@]}" \
  "${oauth_args[@]}"
