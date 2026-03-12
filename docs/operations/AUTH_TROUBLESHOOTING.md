# Auth Troubleshooting

## Test contour quick checks

Public test URLs:
- `https://dtm.solofarm.ru/test/`
- `https://dtm.solofarm.ru/test/admin`
- `https://dtm.solofarm.ru/test/ops/auth/health`
- `https://dtm.solofarm.ru/test/ops/auth/me`

Expected baseline:
- `/test/` -> `200`
- `/test/admin` -> `200`
- `/test/ops/auth/health` -> `{"ok":true,"contour":"test","kind":"auth"}`
- `/test/ops/auth/me` without cookie -> anonymous auth state
- в правом верхнем углу timeline UI кнопка пользователя открывает auth-панель
- для guest auth-панель показывает `Не авторизован` и кнопку `Войти через Яндекс`

## Frontend opens, but auth status stays guest

Check:
- `https://dtm.solofarm.ru/test/ops/auth/health` returns `200`
- `https://dtm.solofarm.ru/test/ops/auth/me` returns JSON, not HTML and not `404`
- browser is opening deployed frontend, not local dev server
- gateway still routes `/test/ops/auth/*` to `auth-test`
- auth-панель после открытия показывает guest status, а не имя/email пользователя

## Local dev mode for interactive design work

Local Vite frontend is allowed to use the public test auth contour:
- local app -> `http://localhost:5173`
- auth -> `https://dtm.solofarm.ru/test/ops/auth/*`
- data path -> `https://dtm.solofarm.ru/test/ops/bff/*`

Expected behavior:
- `/ops/auth/me` from localhost returns credentialed CORS with exact origin
- login button opens `https://dtm.solofarm.ru/test/ops/auth/login?...`, not `/ops/auth/...`
- Yandex login may redirect back to `http://localhost:5173/...`
- после возврата с OAuth auth-панель на localhost показывает обновлённый status и пользователя

Quick checks:

```powershell
curl.exe -i -H "Origin: http://localhost:5173" https://dtm.solofarm.ru/test/ops/auth/me
curl.exe -i -H "Origin: http://localhost:5173" "https://dtm.solofarm.ru/test/ops/bff/v2/frontend?statuses=work,pre_done&include_people=true&limit=2"

## Включено маскирование, хотя пользователь approved/admin

Проверьте, не включён ли masking toggle в UI.

Что происходит технически:
- при обычном режиме frontend отправляет browser API request с auth cookie;
- при принудительном маскировании frontend отправляет тот же запрос без auth cookie;
- auth proxy воспринимает такой запрос как guest/masked и проксирует в backend `x-dtm-access-mode: masked`.

Проверка:
- откройте auth-панель;
- выключите `Принудительная маскировка`;
- повторите запрос к `/ops/bff/*` или `/test/ops/bff/*`.

## Backend не понимает, когда отдавать full, а когда masked

Backend не должен анализировать browser cookie самостоятельно.

Надо опираться на headers от auth proxy:
- `x-dtm-access-mode`
- `x-dtm-authenticated`
- `x-dtm-user-id`
- `x-dtm-user-role`
- `x-dtm-user-status`

Полный handoff описан в:
- `docs/contracts/BACKEND_AUTH_HANDOFF.md`
```

If localhost opens `/ops/auth/...` instead of `/test/ops/auth/...`:
- check `apps/web/src/config/runtimeContour.ts`
- local hosts must resolve to `test` contour but keep SPA base path `/`

## Admin page says administrator access is required

Check:
- user is actually logged in through Yandex
- user role in test YDB is `admin`
- cookie is still valid
- `session_version` was not invalidated
- в auth-панели кнопка `Админка` для non-admin должна быть disabled, а не активной
- если route `/test/admin` открыт руками, страница должна явно объяснять причину отказа:
  - не залогинен -> войдите через Яндекс
  - нет admin role -> нет прав администратора

If `ADMIN_BOOTSTRAP_UID_TEST` is still not set, raise the first admin manually:

```bash
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
```

## Deploy function fails on secrets

Check lockbox / env entries:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`
- `SESSION_SIGNING_SECRET`
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `BROWSER_AUTH_PROXY_SECRET`

## Function does not see YDB

Check:
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- function service account
- migrations were applied to the same contour that function uses

## Gateway routes drifted

Regenerate and apply the current unified gateway spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```
