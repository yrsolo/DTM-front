# Auth And Access

Назначение:
- зафиксировать текущий V1-контракт авторизации и access modes.

Source of truth:
- `apps/auth/src/*`
- `apps/web/src/auth/useAuthSession.ts`
- `apps/web/src/config/runtimeContour.ts`
- `apps/web/src/config/telegramRuntime.ts`

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
- mini app SPA: `https://dtm.solofarm.ru/app`
- mobile web SPA: `https://dtm.solofarm.ru/m`
- admin SPA: `https://dtm.solofarm.ru/admin`
- auth endpoints: `https://dtm.solofarm.ru/ops/auth/*`
- browser-facing API path: `https://dtm.solofarm.ru/ops/bff/*`

Mobile routes:
- test: `https://dtm.solofarm.ru/test/app`
- prod: `https://dtm.solofarm.ru/app`
- test mobile web: `https://dtm.solofarm.ru/test/m`
- prod mobile web: `https://dtm.solofarm.ru/m`

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
- при каждом привилегированном запросе `sv` сверяется с auth runtime storage

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

Telegram Mini App behavior:
- frontend может отправить `Telegram WebApp initData` в `POST /telegram/session`
- auth contour валидирует `initData` через bot token и сначала ищет пользователя по сохранённому `telegram id`
- если `telegram id` ещё не записан в auth runtime storage, auth делает auto-heal linkage:
  - ищет человека в backend people directory по `telegramId`
  - если есть `yandexEmail`, пытается найти существующего auth user и записывает linkage
  - если user по email не найден (или email отсутствует), создаёт auth user на базе Telegram + person linkage
- при успехе Mini App получает обычную contour-specific session cookie
- если linkage не удалось восстановить, frontend показывает явный Telegram unlinked state вместо тихого `guest`
- это не создаёт отдельный data path: после выдачи cookie браузер/webview продолжает работать через те же `/ops/auth/*` и `/ops/bff/*`
- пользователям, у которых `telegramId` есть в people directory, больше не требуется Yandex login для доступа к Mini App
- если Telegram initData содержит `photo_url`, auth сохраняет его как `avatarUrl` для пользователя (для telegram-first логина)

Mobile web behavior:
- `/m` и `/test/m` используют тот же mobile shell, что и Telegram Mini App;
- auth bootstrap там обычный web/Yandex, без `Telegram WebApp initData`;
- task scoping uses the regular `authSession.user.personId`, not Telegram runtime linkage;
- visual/design changes for mobile shell are shared between `/app` and `/m`.

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

Session metadata:
- `/ops/auth/me` and `/test/ops/auth/me` return:
  - `sessionKind`
  - `expiresAt`
  - `temporaryAccessLabel`
- current supported session sources:
  - `yandex`
  - `telegram`
  - `temp_link`
- temp-link session uses:
  - `sessionKind = temp_link`
  - `expiresAt` for auth-panel countdown
  - `temporaryAccessLabel` for operator-facing session naming

Browser data request behavior:
- default mode для approved/admin -> frontend отправляет browser API requests с auth cookie
- guest и pending получают masked data из-за отсутствия full access
- temp-link session behaves like approved viewer:
  - full access
  - no admin rights
  - first-entry bootstrap redeems the link before the initial snapshot fetch, so the user does not see a temporary masked payload flash
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
- `GET /admin/access-links`
- `POST /admin/access-links`
- `PATCH /admin/access-links/:id`
- `POST /admin/access-links/:id/revoke`
- `GET /admin/access-links/:id/usage`
- `POST /telegram/session`
- `POST /access-links/redeem`
- `POST /admin/users/:id/approve`
- `POST /admin/users/:id/reject`
- `POST /admin/users/:id/revoke`
- `POST /admin/users/:id/make-admin`
- `POST /admin/users/:id/remove-admin`
- `POST /admin/allowlist`
- `POST /admin/designers/refresh`
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

Current admin IA:
- top-level tabs:
  - `Доступ`
  - `Стиль`
- nested tabs under `Доступ`:
  - `Люди`
  - `Ссылки`
- nested tabs under `Стиль`:
  - `Пресеты`

`Доступ -> Люди` keeps current runtime actions:
- pending / approved users
- approve / reject / revoke
- admin role toggle
- allowlist
- `Обновить базу дизайнеров`

`Доступ -> Ссылки` is live runtime surface for temporary access links:
- reusable viewer links are created under auth contour
- browser URL is intentionally minimal:
  - current copied format is ordinary SPA route (`/` or `/test/`) + query `?k=<12-char-code>`
  - the recipient does not see verbose token naming in the URL
- frontend still accepts legacy `access_link` query tokens for backward compatibility, but newly copied links use `k`
- each link card shows:
  - label
  - status
  - expiresAt
  - remaining time
  - useCount
  - lastUsedAt
  - quick copy browser URL
  - usage log / stats panel
- operator actions:
  - create
  - edit label / expiry
  - revoke
  - copy browser URL
- runtime semantics:
  - full unmasked access like approved viewer
  - never admin access
  - auth-panel countdown until expiry
  - every successful redemption increments usage stats and writes a usage event

`Стиль -> Пресеты` hosts the existing color/layout preset management without changing the current preset business logic.

## OAuth apps

Используются две отдельные Yandex OAuth apps:
- test -> callback `https://dtm.solofarm.ru/test/ops/auth/callback`
- prod -> callback `https://dtm.solofarm.ru/ops/auth/callback`

## Avatar contract

- auth service читает avatar metadata из Yandex profile (`default_avatar_id`)
- `user.avatarUrl` может возвращаться в `/me`
- admin overview возвращает `avatarUrl` для карточек пользователей
- если avatar отсутствует или не загрузился, UI показывает fallback по инициалам

## Person linkage

- source of truth для `currentPersonId` живёт в auth runtime storage, а не во frontend selectors
- web login best-effort синхронизирует linkage по email с backend people source
- admin action `Обновить базу дизайнеров` повторно синхронизирует linkage и `telegram id`
- `POST /telegram/session` умеет on-demand восстанавливать linkage по цепочке `telegramId -> people directory -> (auth user by email) -> auth user`
- если user по email не найден, auth создаёт telegram-based user и сразу выдаёт approved session
- Mini App не запрашивает отдельный `my tasks` payload: frontend получает общий snapshot и затем делает client-side filtering `mine / all`

## Подробнее

- Backend/proxy handoff: [BACKEND_AUTH_HANDOFF.md](../deep/BACKEND_AUTH_HANDOFF.md)
- Deploy и runtime auth details: [AUTH_DEPLOY.md](../deep/AUTH_DEPLOY.md)
- Troubleshooting: [AUTH_TROUBLESHOOTING.md](../deep/AUTH_TROUBLESHOOTING.md)

