# Backend Auth Handoff

Назначение:
- передать backend-команде browser-facing contract для auth/data контуров.

## Browser-facing contract

Frontend не должен ходить в upstream API напрямую.

### Test
- browser data path -> `/test/api/v2/frontend`
- auth/session -> `/test/auth/*`

### Prod
- browser data path -> `/api/v2/frontend`
- auth/session -> `/auth/*`

## Ownership boundaries

Эта кампания не реализует backend paths:
- `/api/*`
- `/info/*`
- `/test/api/*`
- `/test/info/*`

Frontend и auth layer только адресуют эти пути как публичный контракт.

## Access modes

Система различает два режима:
- `masked`
- `full`

Backend later phase должен уметь уважать access mode и возвращать snapshot той же формы.

## Recommended upstream contract

Рекомендуемый trusted-proxy header:
- `X-DTM-Access-Mode: masked|full`

Backend later phase должен:
- принимать этот заголовок от trusted proxy layer
- возвращать валидный snapshot той же формы
- сохранять shape/ids/dates/statuses
- менять только чувствительные текстовые поля

## Что не должно ломаться

- snapshot shape
- task ids
- group ids
- people ids
- timeline dates
- statuses
- milestones array shape
