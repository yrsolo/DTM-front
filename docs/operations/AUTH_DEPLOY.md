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
- auth endpoints: `https://dtm.solofarm.ru/test/auth/*`
- backend-owned API: `https://dtm.solofarm.ru/test/api/*`
- backend-owned info: `https://dtm.solofarm.ru/test/info/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/auth/*`
- backend-owned API: `https://dtm.solofarm.ru/api/*`
- backend-owned info: `https://dtm.solofarm.ru/info/*`

## Auto-deploy

- `push` в `dev` -> migrations for test + deploy `auth-test`
- prod deploy -> `workflow_dispatch` only

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

## Gateway update

Unified gateway должен:
- направлять `/auth/*` в `auth-prod`
- направлять `/test/auth/*` в `auth-test`
- не отправлять `/api/*`, `/info/*`, `/test/api/*`, `/test/info/*` в SPA fallback
- отдавать `/admin` из root SPA и `/test/admin` из test SPA

Обновление spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```

## Bootstrap without `ADMIN_BOOTSTRAP_UID`

Пока bootstrap UID не добавлен, используйте локальную утилиту:

```bash
node scripts/auth_admin_tool.mjs --target test --command list-users
node scripts/auth_admin_tool.mjs --target test --command add-allowlist --email user@example.com
node scripts/auth_admin_tool.mjs --target test --command approve-user --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command block-user --user-id <USER_ID>
```

Для production используйте `--target prod`.

## Secrets contract

Contour-specific OAuth credentials являются canonical:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`

Также нужны:
- `SESSION_SIGNING_SECRET`
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `MASKING_SALT_TEST`
- `MASKING_SALT_PROD`

Fallback-keys `YANDEX_CLIENT_ID` и `YANDEX_CLIENT_SECRET` оставлены только для совместимости со старыми версиями функции.

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
