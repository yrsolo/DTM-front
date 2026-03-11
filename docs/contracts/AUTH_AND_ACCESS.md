# Auth And Access

## Назначение
Документ описывает текущий V1-контракт авторизации и режимов доступа для `DTM-front`.

Source of truth:
- `apps/auth/src/*`
- `apps/web/src/auth/useAuthSession.ts`
- `apps/web/src/config/runtimeContour.ts`

## Контуры

### Test
- frontend: `https://dtm.solofarm.ru/test-front/`
- admin SPA: `https://dtm.solofarm.ru/test-front/admin`
- auth endpoints: `https://dtm.solofarm.ru/test/auth/*`
- api proxy: `https://dtm.solofarm.ru/test/api/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/prod/auth/*`
- api proxy: `https://dtm.solofarm.ru/prod/api/*`

## Модель доступа

### Anonymous
- фронт открывается без логина
- `/auth/me` возвращает `authenticated=false`
- `/api/*` через proxy отдаёт `masked` payload

### Authenticated + pending
- пользователь прошёл Yandex login
- учётная запись есть, но не одобрена
- `/auth/me` возвращает `authenticated=true`, `status=pending`, `accessMode=masked`
- `/api/*` по-прежнему отдаёт `masked` payload

### Authenticated + approved
- пользователь одобрен через admin UI или auto-approve по allowlist email
- `/auth/me` возвращает `authenticated=true`, `status=approved`, `accessMode=full`
- `/api/*` отдаёт полный payload

### Blocked
- user status `blocked`
- текущая сессия немедленно теряет силу через `session_version`
- дальнейшие обращения деградируют до anonymous/masked поведения

## Session
- cookie: httpOnly
- flags: `HttpOnly`, `Path=/`, `SameSite` и `Secure` управляются secret/env
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
- React route:
  - `/admin`
  - `/test-front/admin`
- JSON endpoints:
  - `/prod/auth/admin/*`
  - `/test/auth/admin/*`

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
