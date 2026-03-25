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
```

## Local developer auth lane

The localhost-only developer lane is intended for visual design and QA work without Yandex or Telegram login.

Required runtime conditions:
- auth contour = `test`
- request origin = localhost (`localhost`, `127.0.0.1`, `::1`, `*.local`)
- auth runtime env:
  - `LOCAL_DEV_AUTH_ENABLED_TEST=1`
  - `LOCAL_DEV_AUTH_TOKEN=<bootstrap token>`
- local frontend env:
  - `VITE_LOCAL_DEV_AUTH_TOKEN=<bootstrap token>`

Expected behavior:
- auth panel on localhost shows a `Local dev auth` block
- the block can load persona catalog from:
  - bootstrap token
  - admin-created dev-token
- persona switching issues a normal `test` session cookie
- `/test/ops/auth/me` then reports `sessionKind = "dev_local"`

Supported local personas:
- real approved users
- real pending users
- `guest`
- synthetic `blocked`

If the dev panel is missing:
- confirm the app is opened from localhost, not deployed `/test/`
- confirm `VITE_LOCAL_DEV_AUTH_TOKEN` is present in local frontend env
- easiest Windows launch path: `npm run web:dev:test-local-auth` (reads `LOCAL_DEV_AUTH_TOKEN` from repo `.env` and forwards it into `VITE_LOCAL_DEV_AUTH_TOKEN`)
- confirm auth runtime has `LOCAL_DEV_AUTH_ENABLED_TEST=1`
- hard refresh localhost after env change

If localhost dev token exchange returns `403`:
- confirm request origin is really localhost
- confirm you are talking to `https://dtm.solofarm.ru/test/ops/auth/*`, not prod
- confirm the bootstrap token or admin-generated dev-token is active and not expired

Quick manual checks:

```powershell
curl.exe -i ^
  -H "Origin: http://localhost:5173" ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"<bootstrap-or-dev-token>\"}" ^
  https://dtm.solofarm.ru/test/ops/auth/dev/session/catalog
```

## Login opens a full white page

Expected behavior now:
- clicking `Подключиться` opens Yandex OAuth in a popup window
- the main DTM page stays visible in the background
- after successful callback the popup closes itself and the auth panel refreshes

If a full-page redirect still happens:
- the popup was blocked by the browser, so frontend fell back to normal redirect
- allow popups for `dtm.solofarm.ru`
- retry login from the auth panel

## Test and prod share one domain

Current public host is shared:
- prod -> `https://dtm.solofarm.ru/`
- test -> `https://dtm.solofarm.ru/test/`

Expected cookie isolation:
- session cookie name is made contour-specific at runtime (`..._test` / `..._prod`)
- OAuth state cookie is contour-specific and scoped to `AUTH_BASE_PATH`

Typical collision symptoms:
- login in one contour unexpectedly resets or hides session in the other
- OAuth callback returns with invalid state
- `/test/ops/auth/me` and `/ops/auth/me` show different auth truth than expected after a fresh login

If this starts happening:
- clear site cookies once
- log in again separately in test and prod
- verify current contour calls the correct `/ops/auth/me`

## Session drops too often

Session lifetime is controlled by `SESSION_TTL_SECONDS` in auth runtime.

Current code now uses `SESSION_TTL_SECONDS` for both:
- cookie `Max-Age`
- signed session payload `exp`

Current expected runtime value:
- `15552000` seconds (`180` days)

If users still have to reconnect too often after deploy:
- verify the live auth contour has the expected `SESSION_TTL_SECONDS`
- check whether the browser or extension clears site cookies
- verify `/ops/auth/me` still returns `authenticated: true` before concluding the session is gone

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
- `docs/deep/BACKEND_AUTH_HANDOFF.md`

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

## Admin page returns HTTP 500

If admin UI opens but `GET /ops/auth/admin/overview` or `GET /test/ops/auth/admin/overview` returns `500`:
- check that the contour has the latest auth function version
- check that auth YDB migration was applied to the same contour
- specifically verify the table `admin_layout_prefs` exists

Typical symptom:
- admin page shell opens
- top of the page shows `Не удалось загрузить данные админки (HTTP 500)`

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

Note:
- session cookie name is made contour-specific at runtime (`..._test` / `..._prod`)
- OAuth state cookie is also contour-specific and scoped to `AUTH_BASE_PATH`

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

