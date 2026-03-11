# Auth Deploy

Source of truth:
- `config/deploy.yaml`
- `scripts/deploy_auth_function.ps1`
- `scripts/deploy_auth_function.sh`
- `scripts/migrate_auth_ydb.mjs`
- `scripts/update_unified_gateway.ps1`
- `.github/workflows/deploy_auth.yml`

## Contours

- `test` -> function `auth-test`
- `prod` -> function `auth-prod`

## YDB

Используются две отдельные serverless YDB базы:
- `ydb_database_test`
- `ydb_database_prod`

Shared endpoint:
- `grpcs://ydb.serverless.yandexcloud.net:2135`

## Public routes

### Test
- frontend: `https://dtm.solofarm.ru/test/`
- admin SPA: `https://dtm.solofarm.ru/test/admin`
- auth endpoints: `https://dtm.solofarm.ru/test/ops/auth/*`
- backend-owned API: `https://dtm.solofarm.ru/test/ops/api/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/ops/auth/*`
- backend-owned API: `https://dtm.solofarm.ru/ops/api/*`

## Auto-deploy

- `push` в `dev` -> migrations for test + deploy `auth-test`
- prod deploy -> `workflow_dispatch` only
- GitHub Actions deploy больше не устанавливает `yc` CLI: function version публикуется напрямую через `yc-actions/yc-sls-function`
- в workflow OAuth credentials берутся из GitHub secrets `YANDEX_CLIENT_ID_TEST|PROD` и `YANDEX_CLIENT_SECRET_TEST|PROD`; lockbox остаётся источником session/cookie/masking secrets

## Local deploy

### Test
```powershell
scripts\deploy_auth_function.cmd
```

или

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_auth_function.ps1 -Target test
```

### Prod
```powershell
scripts\deploy_auth_function_prod.cmd
```

или

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_auth_function.ps1 -Target prod
```

## Combined contour deploy

Если нужно задеплоить frontend и auth вместе:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_stack.ps1 -Target test
powershell -ExecutionPolicy Bypass -File scripts/deploy_stack.ps1 -Target prod
```

Windows wrappers:

```bat
scripts\deploy_test.cmd
scripts\deploy_prod.cmd
```

## Gateway update

Unified gateway должен:
- направлять `/ops/auth/*` в `auth-prod`
- направлять `/test/ops/auth/*` в `auth-test`
- не отправлять `/ops/*` и `/test/ops/*` в SPA fallback
- отправлять `/admin` в prod SPA и `/test/admin` в test SPA

Обновить spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```

## Bootstrap without `ADMIN_BOOTSTRAP_UID`

Если bootstrap UID ещё не задан, первого администратора можно поднять вручную:

```bash
node scripts/auth_admin_tool.mjs --target test --command list-users
node scripts/auth_admin_tool.mjs --target test --command add-allowlist --email user@example.com
node scripts/auth_admin_tool.mjs --target test --command approve-user --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command block-user --user-id <USER_ID>
```

Для production используется `--target prod`.

## Secrets contract

Contour-specific OAuth credentials считаются canonical:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`

Важно:
- fallback на общие OAuth credentials больше не используется
- в lockbox или environment secrets должны лежать именно contour-specific ключи
- иначе `auth-test` или `auth-prod` не задеплоятся корректно

Также нужны:
- `SESSION_SIGNING_SECRET`
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `MASKING_SALT_TEST`
- `MASKING_SALT_PROD`

Для GitHub Actions также нужны:
- `YC_SA_JSON_CREDENTIALS` для deploy/migrations
- contour-specific GitHub secrets `YANDEX_CLIENT_ID_TEST`, `YANDEX_CLIENT_SECRET_TEST`, `YANDEX_CLIENT_ID_PROD`, `YANDEX_CLIENT_SECRET_PROD`

## Runtime env

Function version получает:
- `CONTOUR`
- `BASE_URL`
- `AUTH_BASE_PATH`
- `API_PROXY_BASE_PATH`
- `API_UPSTREAM_ORIGIN`
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- `YDB_METADATA_CREDENTIALS=1`
