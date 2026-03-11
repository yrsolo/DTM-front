#!/usr/bin/env bash
set -euo pipefail

TARGET="test"
DRY_RUN="false"

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
  api_proxy_base_path="/test/ops/api"
  api_upstream_origin="$api_origin_test"
  masking_secret_key="MASKING_SALT_TEST"
  oauth_client_id_env_name="YANDEX_CLIENT_ID_TEST"
  oauth_client_secret_env_name="YANDEX_CLIENT_SECRET_TEST"
else
  function_name="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.auth_function_name_prod)")"
  ydb_database="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.ydb_database_prod)")"
  auth_base_path="/ops/auth"
  api_proxy_base_path="/ops/api"
  api_upstream_origin="$api_origin_prod"
  masking_secret_key="MASKING_SALT_PROD"
  oauth_client_id_env_name="YANDEX_CLIENT_ID_PROD"
  oauth_client_secret_env_name="YANDEX_CLIENT_SECRET_PROD"
fi

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
  --secret "id=$lockbox_id,key=$masking_secret_key,environment-variable=MASKING_SALT"
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

yc serverless function version create \
  --function-name "$function_name" \
  --runtime "$function_runtime" \
  --entrypoint "$function_entrypoint" \
  --memory "$function_memory" \
  --execution-timeout "$function_timeout" \
  --service-account-id "$service_account_id" \
  --source-path "apps/auth/dist" \
  --environment "CONTOUR=$TARGET" \
  --environment "BASE_URL=https://dtm.solofarm.ru" \
  --environment "AUTH_BASE_PATH=$auth_base_path" \
  --environment "API_PROXY_BASE_PATH=$api_proxy_base_path" \
  --environment "API_UPSTREAM_ORIGIN=$api_upstream_origin" \
  --environment "YDB_ENDPOINT=$ydb_endpoint" \
  --environment "YDB_DATABASE=$ydb_database" \
  --environment "YDB_METADATA_CREDENTIALS=1" \
  "${secret_args[@]}" \
  "${oauth_args[@]}"
