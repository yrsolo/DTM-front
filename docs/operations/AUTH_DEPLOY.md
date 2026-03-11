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

Two separate serverless YDB databases are used:
- `ydb_database_test`
- `ydb_database_prod`

Shared endpoint:
- `grpcs://ydb.serverless.yandexcloud.net:2135`

## Public routes

### Test
- frontend: `https://dtm.solofarm.ru/test-front/`
- admin SPA: `https://dtm.solofarm.ru/test-front/admin`
- auth endpoints: `https://dtm.solofarm.ru/test/auth/*`
- API proxy: `https://dtm.solofarm.ru/test/api/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/prod/auth/*`
- API proxy: `https://dtm.solofarm.ru/prod/api/*`

## Auto-deploy

- `push` to `dev` -> migrations for test + deploy `auth-test`
- `prod` deploy -> `workflow_dispatch` only

## Local deploy

### Test

```powershell
scripts\deploy_auth_function.cmd
```

or

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_auth_function.ps1 -Target test
```

### Prod

```powershell
scripts\deploy_auth_function_prod.cmd
```

or

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_auth_function.ps1 -Target prod
```

## Gateway update

The public domain routing for auth/admin/API proxy is managed by the unified gateway.

Apply the current gateway spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```

The spec keeps legacy backend paths:
- `/test/*` -> legacy test backend function
- `/prod/*` -> legacy prod backend function

And adds auth/proxy overrides:
- `/test/auth/*` -> `auth-test`
- `/test/api/*` -> `auth-test`
- `/prod/auth/*` -> `auth-prod`
- `/prod/api/*` -> `auth-prod`

## Bootstrap without `ADMIN_BOOTSTRAP_UID`

Until bootstrap UID is added, use the local utility:

```bash
node scripts/auth_admin_tool.mjs --target test --command list-users
node scripts/auth_admin_tool.mjs --target test --command add-allowlist --email user@example.com
node scripts/auth_admin_tool.mjs --target test --command approve-user --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
node scripts/auth_admin_tool.mjs --target test --command block-user --user-id <USER_ID>
```

Use `--target prod` for the production contour.

## Dry-run

PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy_auth_function.ps1 -Target test -DryRun
```

bash:

```bash
bash scripts/deploy_auth_function.sh --target test --dry-run
```

## Secrets contract

Function deploy reads lockbox entries:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`
- `SESSION_SIGNING_SECRET`
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `MASKING_SALT_TEST`
- `MASKING_SALT_PROD`

Deferred:
- `ADMIN_BOOTSTRAP_UID_TEST`
- `ADMIN_BOOTSTRAP_UID_PROD`

The contour-specific Yandex OAuth credentials are canonical.
The common `YANDEX_CLIENT_ID` and `YANDEX_CLIENT_SECRET` remain only as a temporary fallback for older function versions.

Deploy scripts use this precedence:
1. contour-specific env vars in the current shell / CI environment
2. common lockbox fallback keys

## Runtime env

Non-secret env on function version:
- `CONTOUR`
- `BASE_URL`
- `AUTH_BASE_PATH`
- `API_PROXY_BASE_PATH`
- `API_UPSTREAM_ORIGIN`
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- `YDB_METADATA_CREDENTIALS=1`
