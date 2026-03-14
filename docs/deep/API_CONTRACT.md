# API-контракт frontend snapshot

Этот документ описывает ту часть backend-контракта, на которую реально опирается frontend.

Для кого:
- frontend-инженер;
- backend-инженер, меняющий snapshot endpoint;
- инженер поддержки.

Source of truth в коде:
- [api.ts](../../apps/web/src/data/api.ts)
- [normalize.ts](../../apps/web/src/data/normalize.ts)
- пример ответа: [snapshot.test.json](../../apps/web/public/data/snapshot.test.json)

## Endpoint

Frontend работает с runtime-сконфигурированным endpoint:
- `api_base_url`
- `api_frontend_path`

Итоговый URL собирается в `api.ts`.

## Query-параметры

Текущий запрос использует:
- `statuses`
- `include_people`
- `limit`
- `window_enabled`
- `window_start`
- `window_end`
- `window_mode`

### Важное текущее поведение

UI-кнопки статусов не ограничивают состав запроса. Фронт запрашивает сразу все основные статусы:
- `work`
- `pre_done`
- `done`
- `wait`

Это сделано для того, чтобы переключатели статусов влияли только на отображение, а не на полноту локального snapshot.

## HTTP-поведение

`api.ts` реализует:
- timeout;
- retry;
- задержку между retry;
- conditional request через ETag/If-None-Match;
- обработку `304 Not Modified`;
- rate-limit guard от слишком частых запросов.

## Структура ответа

Frontend рассчитывает на snapshot следующего вида:
- `meta`
- `summary`
- `filters`
- `entities`
- `tasks`

### `meta`

Используется для:
- диагностики;
- показа служебной информации в UI;
- persisted meta cache.

Типично содержит:
- generated/synced timestamps;
- hash;
- source;
- paging;
- feature flags backend snapshot.

### `summary`

Используется как справочный агрегат:
- число задач;
- milestones;
- людей;
- групп.

### `filters`

Несёт факт того, какие query-фильтры были применены backend.

### `entities`

Содержит справочники:
- `groups`
- `people`
- `tags`
- `enums`

### `tasks`

Основной массив задач. Для UI важны поля:
- `id`
- `title`
- `brand`
- `customer`
- `groupId`
- `ownerId`
- `status`
- `date`
- `format_`
- `history`
- `milestones`

## Структура milestone

Каждый milestone ожидается как объект примерно следующего вида:
- `type`
- `planned`
- `actual`
- `status`

Frontend допускает исторические вариации названий `type`, потому что backend-лексика менялась.

## Что обязательно для корректного UI

Минимальный набор для полезного рендера:
- tasks с валидным `id`;
- хотя бы часть `entities.people` и `entities.groups`;
- даты задач;
- milestone types и planned dates.

## Что может быть частичным

Frontend умеет переживать:
- пустые `customer`;
- отсутствующие `tags`;
- неизвестные milestone types;
- частично заполненные entities.

В этом случае интерфейс использует fallback label или default color category.

## Гарантии и предположения

Фронт предполагает, что:
- `tasks` — массив;
- `entities` может быть неполным, но структура объекта сохраняется;
- `date.start`, `date.end`, `date.nextDue` приходят в ISO-like виде;
- milestone planned dates пригодны для вычисления позиции на timeline.

## Что frontend делает при ошибках или частичном ответе

- если свежая загрузка не удалась, может использовать persisted snapshot;
- если milestone type не распознан, окрашивает его через категорию `default`;
- если часть entities отсутствует, показывает fallback вместо полного имени или названия группы.

