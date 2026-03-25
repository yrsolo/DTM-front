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
- browser-facing data path: `https://dtm.solofarm.ru/test/ops/bff/*`
- backend-owned API: `https://dtm.solofarm.ru/test/ops/api/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/ops/auth/*`
- browser-facing data path: `https://dtm.solofarm.ru/ops/bff/*`
- backend-owned API: `https://dtm.solofarm.ru/ops/api/*`

## Auto-deploy

- `push` в `dev` -> migrations for test + deploy `auth-test`
- prod deploy -> `workflow_dispatch` only
- GitHub Actions deploy больше не устанавливает `yc` CLI: function version публикуется напрямую через `yc-actions/yc-sls-function`
- в workflow OAuth credentials берутся из GitHub secrets `YANDEX_CLIENT_ID_TEST|PROD` и `YANDEX_CLIENT_SECRET_TEST|PROD`; lockbox остаётся источником session/cookie/proxy secrets

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

Локальные deploy scripts пытаются взять `YC_SA_JSON_CREDENTIALS`, `AWS_ACCESS_KEY_ID` и `AWS_SECRET_ACCESS_KEY` из process env, а если их нет, читают эти значения из repo `.env`.

Важно:
- deploy auth function сам по себе не прогоняет YDB migration;
- если в auth-коде меняется схема `users` или других auth-таблиц, migration нужно выполнять отдельно до проверки contour;
- для production это особенно важно, иначе новые admin/auth endpoints могут отвечать YDB schema error even при успешном deploy функции.

Ручной запуск migration:

```powershell
node scripts/migrate_auth_ydb.mjs --target test
node scripts/migrate_auth_ydb.mjs --target prod
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

Замечание:
- `deploy_stack.ps1`, `deploy_test.cmd` и `deploy_prod.cmd` сейчас деплоят frontend + auth, но не запускают `migrate_auth_ydb.mjs`;
- migration остаётся отдельным обязательным шагом при schema changes в auth runtime storage.

## Gateway update

Unified gateway должен:
- направлять `/ops/auth/*` в `auth-prod`
- направлять `/test/ops/auth/*` в `auth-test`
- направлять `/ops/bff/*` в `auth-prod`
- направлять `/test/ops/bff/*` в `auth-test`
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
- `TG_TOKEN` for Mini App session bootstrap via `POST /telegram/session`
- `PROXY_URL` for server-side Telegram SDK proxy via `GET /ops/auth/telegram/sdk`
- `PEOPLE_SYNC_PATH` if backend people directory lives outside the default auth-side path (`/v2/people`)
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `BROWSER_AUTH_PROXY_SECRET`
- `PROXY_URL`

Cookie behavior:
- runtime автоматически делает session cookie contour-specific, добавляя suffix `_test` или `_prod` к `COOKIE_NAME`
- OAuth state cookie тоже contour-specific и ограничивается `AUTH_BASE_PATH`, чтобы `test` и `prod` на одном домене не конфликтовали
- при одном домене `dtm.solofarm.ru` это считается обязательной частью auth isolation, а не optional polish

Current operational value:
- `SESSION_TTL_SECONDS=15552000` (`180` days, about half a year)
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

Для GitHub Actions также нужны:
- `YC_SA_JSON_CREDENTIALS` для deploy/migrations
- `AWS_ACCESS_KEY_ID` и `AWS_SECRET_ACCESS_KEY` для cloud preset catalog в `dtm-presets`
- contour-specific GitHub secrets `YANDEX_CLIENT_ID_TEST`, `YANDEX_CLIENT_SECRET_TEST`, `YANDEX_CLIENT_ID_PROD`, `YANDEX_CLIENT_SECRET_PROD`

## Runtime env

Function version получает:
- `CONTOUR`
- `BASE_URL`
- `AUTH_BASE_PATH`
- `API_PROXY_BASE_PATH`
  Browser-facing proxy namespace. Current values:
  `test=/test/ops/bff`, `prod=/ops/bff`
- `API_UPSTREAM_ORIGIN`
  Backend upstream base origin including service path prefix.
  Current values resolve to:
  `test=https://dtm-api-test.solofarm.ru/api`
  `prod=https://dtm-api.solofarm.ru/api`
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- `YDB_METADATA_CREDENTIALS=1`
- `PRESET_BUCKET=dtm-presets`
- `PRESET_PUBLIC_BASE_URL=https://dtm-presets.website.yandexcloud.net`
- `PRESET_STORAGE_ENDPOINT=https://storage.yandexcloud.net`
- `PRESET_STORAGE_REGION=ru-central1`
- preset runtime reads/writes must continue to work even if `PRESET_PUBLIC_BASE_URL` alias is unavailable; public storage endpoint remains the canonical fallback
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `BROWSER_AUTH_PROXY_SECRET`

## Admin runtime data

Auth YDB migration now must include:
- `users`
- `allowlist_emails`
- `access_requests`
- `audit_log`
- `admin_layout_prefs`

`users` now also carries linkage-related optional fields:
- `person_id`
- `person_name`
- `telegram_id`
- `telegram_username`

If `admin_layout_prefs` is missing in a contour, admin overview may return `HTTP 500`.

