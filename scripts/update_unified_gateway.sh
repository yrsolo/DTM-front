#!/usr/bin/env bash
set -euo pipefail

DRY_RUN="false"
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="true"
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
frontend_bucket_prod="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.frontend_bucket_prod)")"
frontend_bucket_test="$(node -e "const cfg=$CONFIG_JSON; process.stdout.write(cfg.yandex_cloud.frontend_bucket_test)")"
latest_tag='\$latest'

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
  yc config profile create gateway-update >/dev/null 2>/dev/null || true
  yc config set service-account-key "$temp_dir/sa-key.json" >/dev/null
fi

yc config set folder-id "$folder_id" >/dev/null

test_backend_id="$(yc serverless function get --name dtm --format json | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).id")"
prod_backend_id="$(yc serverless function get --name dtm-prod --format json | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).id")"
auth_test_id="$(yc serverless function get --name auth-test --format json | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).id")"
auth_prod_id="$(yc serverless function get --name auth-prod --format json | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).id")"

mkdir -p .deploy
spec_path=".deploy/unified-gateway.openapi.yaml"

cat > "$spec_path" <<EOF
openapi: 3.0.0
info:
  title: DTM Unified API
  version: 1.2.0

servers:
  - url: https://dtm.solofarm.ru

paths:
  /test/ops/auth/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${auth_test_id}
        tag: ${latest_tag}
        service_account_id: ${service_account_id}

  /ops/auth/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${auth_prod_id}
        tag: ${latest_tag}
        service_account_id: ${service_account_id}

  /test/ops/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${test_backend_id}
        tag: ${latest_tag}
        service_account_id: ${service_account_id}

  /ops/{proxy+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: proxy
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: cloud_functions
        function_id: ${prod_backend_id}
        tag: ${latest_tag}
        service_account_id: ${service_account_id}

  /grafana:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /grafana/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana/
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /grafana/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: http://89.169.132.198:3000/grafana/{path}
        headers:
          Host: dtm.solofarm.ru
          X-Forwarded-Proto: https
          '*': '*'
        query:
          '*': '*'
        timeouts:
          connect: 1
          read: 30

  /test:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: $test_frontend/index.html

  /test/:
    x-yc-apigateway-any-method:
      x-yc-apigateway-integration:
        type: http
        url: https://${frontend_bucket_test}.website.yandexcloud.net/index.html

  /test/{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: https://${frontend_bucket_test}.website.yandexcloud.net/{path}

  /:
    get:
      x-yc-apigateway-integration:
        type: http
        url: https://${frontend_bucket_prod}.website.yandexcloud.net/

  /{path+}:
    x-yc-apigateway-any-method:
      parameters:
        - name: path
          in: path
          required: true
          schema:
            type: string
      x-yc-apigateway-integration:
        type: http
        url: https://${frontend_bucket_prod}.website.yandexcloud.net/{path}
EOF

if [[ "$DRY_RUN" == "true" ]]; then
  echo "Gateway spec generated: $spec_path"
  exit 0
fi

yc serverless api-gateway update --name dtm-api-unified --spec "$spec_path"
