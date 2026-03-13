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
- auth endpoints: `https://dtm.solofarm.ru/test/ops/auth/*`
- browser-facing API path: `https://dtm.solofarm.ru/test/ops/bff/*`
- local frontend runtime тоже использует `test` contour для auth/api:
  - local SPA base остаётся `/`
  - auth requests идут в `https://dtm.solofarm.ru/test/ops/auth/*`
  - data requests идут в `https://dtm.solofarm.ru/test/ops/bff/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/ops/auth/*`
- browser-facing API path: `https://dtm.solofarm.ru/ops/bff/*`

## Модель доступа

### Anonymous
- frontend открывается без логина
- `/ops/auth/me` возвращает `authenticated=false`
- data path работает в режиме, который определяет backend/auth contour

### Authenticated + pending
- пользователь прошёл Yandex login
- учётная запись есть, но не одобрена
- `/ops/auth/me` возвращает `authenticated=true`, `status=pending`

### Authenticated + approved
- пользователь одобрен через admin UI или allowlist
- `/ops/auth/me` возвращает `authenticated=true`, `status=approved`, `accessMode=full`

### Blocked
- user status `blocked`
- текущая сессия инвалидируется через `session_version`

## Session

- session cookie: httpOnly
- session cookie name is made contour-specific at runtime by suffixing `_test` or `_prod` to `COOKIE_NAME`
- session cookie path comes from `COOKIE_PATH`
- OAuth state cookie is also contour-specific and scoped to `AUTH_BASE_PATH`
- flags: `HttpOnly`, `Path`, `SameSite`, `Secure`
- claims:
  - `userId`
  - `yandexUid`
  - `role`
  - `status`
  - `sv`
  - `iat`
  - `exp`
- при каждом привилегированном запросе `sv` сверяется с YDB

## Login procedure

Current user-facing auth flow:
- пользователь нажимает `Подключиться` в auth-панели
- frontend открывает Yandex OAuth в popup window
- callback идёт в:
  - test -> `/test/ops/auth/callback`
  - prod -> `/ops/auth/callback`
- после успешного callback popup закрывается сам и обновляет основную страницу
- если popup заблокирован браузером, frontend падает обратно в обычный redirect flow

Cookie/session behavior:
- session cookie и OAuth state cookie изолируются по contour even on the same host `dtm.solofarm.ru`
- текущий runtime TTL задаётся через `SESSION_TTL_SECONDS`
- session claims и cookie `Max-Age` используют одно и то же TTL

## Admin surface

React routes:
- prod: `/admin`
- test: `/test/admin`
- local: `/admin` against `test` contour

User-facing entry flow:
- основной вход в auth/admin начинается с кнопки пользователя в верхней панели timeline UI
- кнопка открывает auth-панель, где видны:
  - текущий auth status
  - access mode (`masked` / `full`)
  - текущий пользователь
  - кнопка входа/выхода
  - кнопка `Админка`
- кнопка `Админка` всегда видима в auth-панели
  - для non-admin она disabled
  - для admin она открывает `/admin` или `/test/admin`

User-visible statuses:
- `Гость` -> не авторизован, данные доступны в masked mode
- `Ожидает одобрения` -> логин успешен, но доступ ещё не подтверждён
- `Пользователь` -> доступ подтверждён, full access есть, admin role нет
- `Администратор` -> full access и доступ к admin UI

Browser data request behavior:
- default mode для approved/admin -> frontend отправляет browser API requests с auth cookie
- guest и pending получают masked data из-за отсутствия full access
- если approved/admin вручную включает маскирование в UI, frontend отправляет browser API requests без auth cookie
- auth proxy на основе cookie сам выставляет upstream headers:
  - `x-dtm-access-mode`
  - `x-dtm-authenticated`
  - `x-dtm-user-id`
  - `x-dtm-user-role`
  - `x-dtm-user-status`

JSON endpoints:
- prod: `/ops/auth/admin/*`
- test: `/test/ops/auth/admin/*`

V1 endpoints:
- `GET /admin/overview`
- `POST /admin/users/:id/approve`
- `POST /admin/users/:id/reject`
- `POST /admin/users/:id/revoke`
- `POST /admin/users/:id/make-admin`
- `POST /admin/users/:id/remove-admin`
- `POST /admin/allowlist`
- `DELETE /admin/allowlist?email=...`
- `POST /admin/layout-order`

Admin personal order:
- порядок карточек в admin UI хранится лично на admin user
- отдельные списки:
  - pending users
  - approved users
  - color presets
  - layout presets
- `GET /admin/overview` возвращает эти списки уже в персональном порядке текущего администратора

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
- test -> callback `https://dtm.solofarm.ru/test/ops/auth/callback`
- prod -> callback `https://dtm.solofarm.ru/ops/auth/callback`

Canonical env contract:
- `YANDEX_CLIENT_ID_TEST`
- `YANDEX_CLIENT_SECRET_TEST`
- `YANDEX_CLIENT_ID_PROD`
- `YANDEX_CLIENT_SECRET_PROD`

Avatar contract:
- auth service читает avatar metadata из Yandex profile (`default_avatar_id`)
- `user.avatarUrl` может возвращаться в `/me`
- admin overview возвращает `avatarUrl` для карточек пользователей
- если avatar отсутствует или не загрузился, UI показывает fallback по инициалам
