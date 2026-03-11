# Backend Auth Handoff

## Назначение
Этот документ нужен backend-команде как target contract для внедрения native auth/masking в `dtm-api`.

## Browser-facing contract
Frontend не должен ходить в upstream API напрямую.

### Test
- browser -> `/test/api/v2/frontend`
- auth/session -> `/test/auth/*`

### Prod
- browser -> `/prod/api/v2/frontend`
- auth/session -> `/prod/auth/*`

На V1 этот контракт обеспечивает `apps/auth` proxy.

## Access modes
Proxy различает два режима:
- `masked`
- `full`

На V1 proxy сам маскирует JSON payload.
На следующем этапе backend может нативно уважать режим доступа и возвращать уже готовый `masked/full` ответ.

## Рекомендуемый upstream contract
Proxy передаёт upstream-заголовок:
- `X-DTM-Access-Mode: masked|full`

Backend later phase должен уметь:
- принимать этот заголовок от trusted proxy layer
- возвращать валидный snapshot той же формы
- сохранять shape/ids/dates/statuses
- менять только чувствительные текстовые поля

## Что маскируется в V1 proxy
- group names
- people names
- task `brand`
- task `customer`
- task `format_`
- task `title`
- task `history`

## Что не должно ломаться
- snapshot shape
- task ids
- group ids
- people ids
- timeline dates
- statuses
- milestones array shape

Идея: не скрыть существование задач, а безопасно скрыть реальные названия и контекст.
