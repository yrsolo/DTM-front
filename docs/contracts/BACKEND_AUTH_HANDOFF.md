# Backend Auth Handoff

Назначение:
- передать backend-команде актуальный browser-facing контракт авторизации и data access mode;
- зафиксировать, какие сигналы backend получает от auth proxy;
- описать, как frontend intentionally переключает `full` и `masked`.

## Browser-facing public contract

### Test
- frontend: `https://dtm.solofarm.ru/test/`
- browser data path: `/test/ops/api/v2/frontend`
- auth/session: `/test/ops/auth/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- browser data path: `/ops/api/v2/frontend`
- auth/session: `/ops/auth/*`

## Reserved service namespace

Backend-owned service routes:
- `/ops/api/*`
- `/ops/admin/*`
- `/ops/telegram*`
- `/test/ops/api/*`
- `/test/ops/admin/*`
- `/test/ops/telegram*`

Shared infra route:
- `/grafana/*`

Frontend SPA routes остаются только:
- `/`
- `/admin`
- `/test`
- `/test/admin`

## Browser -> Auth Proxy

Browser никогда не должен обращаться к backend напрямую.

Frontend всегда ходит через browser-facing auth proxy:
- prod: `/ops/api/*`
- test: `/test/ops/api/*`

Что делает frontend:
- обычный full-flow запрос отправляется с `credentials: "include"`, то есть с auth cookie;
- masked-flow запрос отправляется с `credentials: "omit"`, то есть без auth cookie;
- toggle маскирования на фронтенде переключает именно это поведение;
- браузер не должен сам выставлять доверенные `x-dtm-*` auth headers.

## Auth Proxy -> Backend

Auth proxy сам вычисляет access mode и проксирует запрос дальше в upstream backend.

Backend должен ориентироваться на эти headers:
- `x-dtm-access-mode: full | masked`
- `x-dtm-authenticated: 1 | 0`
- `x-dtm-contour: test | prod`
- `x-dtm-user-id: <uuid>` только для authenticated request
- `x-dtm-user-role: admin | viewer` только для authenticated request
- `x-dtm-user-status: approved | pending | blocked` только для authenticated request

Важно:
- эти headers trustworthy только если запрос пришёл через auth proxy / gateway chain;
- backend не должен принимать browser-supplied `x-dtm-*` как источник истины вне этого контура.

## Required Backend Behavior

### Full Access

Если backend видит:
- `x-dtm-authenticated: 1`
- `x-dtm-access-mode: full`

то он может отдавать нормальные данные без маскирования.

Ожидаемый кейс:
- user approved;
- frontend отправил запрос с cookie;
- auth proxy подтвердил session и проставил `full`.

### Masked Access

Если backend видит:
- `x-dtm-authenticated: 0`
или
- `x-dtm-access-mode: masked`

то backend должен отдавать masked payload.

Это покрывает оба сценария:
- гость или пользователь без действующей auth session;
- авторизованный approved user, который в UI специально включил masking toggle, и frontend намеренно отправил запрос без cookie.

## Sensitive Fields

В masked mode должны скрываться реальные бизнесовые значения, минимум:
- task title
- brand
- customer
- group/show name
- person/designer names
- другие свободные текстовые поля, по которым можно восстановить реальные кампании

## Stable Parts Of Payload

Даже в masked mode желательно сохранять:
- ids
- dates
- statuses
- milestone sequence
- summary/meta structure
- общую форму `frontend v2` payload

## Recommended Backend Pattern

Практическая схема:
1. принимать browser traffic только через `/ops/api/*` или `/test/ops/api/*`;
2. доверять `x-dtm-access-mode` и `x-dtm-authenticated`, выставленным auth proxy;
3. строить один и тот же `frontend v2` payload shape;
4. менять только содержание чувствительных полей, а не структуру ответа;
5. не смешивать авторизацию браузера и внутреннюю service-to-service auth в одном контракте.

## OAuth Callbacks

- test callback: `https://dtm.solofarm.ru/test/ops/auth/callback`
- prod callback: `https://dtm.solofarm.ru/ops/auth/callback`

## Preset Catalog Service

Preset catalog routes are exposed by the auth contour and are shared across `test` and `prod` via the public preset bucket/domain:
- `GET /ops/auth/presets?kind=color|layout`
- `GET /test/ops/auth/presets?kind=color|layout`
- `POST /ops/auth/presets`
- `PUT /ops/auth/presets/:id`
- `DELETE /ops/auth/presets/:id`

Preset assets are public JSON files served from `http://dtm-presets.solofarm.ru`.

Graceful degradation rule:
- if preset catalog or preset asset is unavailable, the application must stay operational in builtin-only mode;
- auth, snapshot loading and API proxy behavior must not depend on preset availability.
