# Backend Auth Handoff

Назначение:
- передать backend-команде browser-facing контракт авторизации и data access mode.

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

## Access modes

Требуемые режимы данных:
- `masked`
- `full`

### Anonymous / pending
- backend может отдавать masked payload
- структура snapshot должна оставаться валидной
- timeline и карточки должны продолжать работать

### Approved
- backend отдаёт полный payload

## Sensitive fields

В masked mode должны скрываться реальные бизнесовые значения, минимум:
- task title
- brand
- customer
- group/show name
- person/designer names
- другие свободные текстовые поля, по которым можно восстановить реальные кампании

## Stable parts of payload

Даже в masked mode желательно сохранять:
- ids
- dates
- statuses
- milestone sequence
- summary/meta structure
- общую форму `frontend v2` payload

## OAuth callbacks

- test callback: `https://dtm.solofarm.ru/test/ops/auth/callback`
- prod callback: `https://dtm.solofarm.ru/ops/auth/callback`
