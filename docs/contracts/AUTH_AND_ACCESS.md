# Auth And Access

Назначение:
- зафиксировать текущий V1-контракт авторизации и access modes.

Source of truth:
- `apps/auth/src/*`
- `apps/web/src/auth/useAuthSession.ts`
- `apps/web/src/config/runtimeContour.ts`

## Контуры

### Test
- frontend: `https://dtm.solofarm.ru/test/`
- admin SPA: `https://dtm.solofarm.ru/test/admin`
- auth endpoints: `https://dtm.solofarm.ru/test/auth/*`
- browser-facing API path: `https://dtm.solofarm.ru/test/api/*`
- local frontend runtime тоже использует `test` contour для auth/api:
  - local SPA base остаётся `/`
  - auth requests идут в `https://dtm.solofarm.ru/test/auth/*`
  - data requests идут в `https://dtm.solofarm.ru/test/api/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/auth/*`
- browser-facing API path: `https://dtm.solofarm.ru/api/*`

## Модель доступа

### Anonymous
- frontend открывается без логина
- `/auth/me` возвращает `authenticated=false`
- data path работает в режиме, который определяет backend/auth contour

### Authenticated + pending
- пользователь прошёл Yandex login
- учётная запись есть, но не одобрена
- `/auth/me` возвращает `authenticated=true`, `status=pending`

### Authenticated + approved
- пользователь одобрен через admin UI или allowlist
- `/auth/me` возвращает `authenticated=true`, `status=approved`, `accessMode=full`

### Blocked
- user status `blocked`
- текущая сессия инвалидируется через `session_version`

## Session

- cookie: httpOnly
- flags: `HttpOnly`, `Path=/`, `SameSite`, `Secure`
- claims:
  - `userId`
  - `yandexUid`
  - `role`
  - `status`
  - `sv`
  - `iat`
  - `exp`
- при каждом привилегированном запросе `sv` сверяется с YDB

## Admin surface

React routes:
- prod: `/admin`
- test: `/test/admin`
- local: `/admin` against `test` contour

JSON endpoints:
- prod: `/auth/admin/*`
- test: `/test/auth/admin/*`

V1 endpoints:
- `GET /admin/overview`
- `POST /admin/users/:id/approve`
- `POST /admin/users/:id/block`
- `POST /admin/allowlist`
- `DELETE /admin/allowlist?email=...`

## YDB contours

Используются две отдельные serverless YDB базы:
- test auth DB
- prod auth DB

Они не делят:
- users
- allowlist
- access requests
- audit log
- session versions

## OAuth apps

Используются две отдельные Yandex OAuth apps:
- test -> callback `https://dtm.solofarm.ru/test/auth/callback`
- prod -> callback `https://dtm.solofarm.ru/auth/callback`

Canonical env contract:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`
