# Поток данных

Этот документ описывает путь данных от runtime-конфига до экранов.

Source of truth:
- `apps/web/src/config/publicConfig.ts`
- `apps/web/src/config/runtimeContour.ts`
- `apps/web/src/data/useSnapshot.ts`
- `apps/web/src/data/api.ts`
- `apps/web/src/data/normalize.ts`

## 1. Загрузка runtime-конфига

`publicConfig.ts` читает конфиг в таком порядке:
1. `config/public.yaml`
2. `config/public.yam`
3. встроенный fallback YAML

Fallback выбирается по runtime path:
- root runtime использует `public.prod.yaml`
- localhost и public `/test/` используют `public.yaml`

## 2. Инициализация runtime state

`Layout.tsx` поднимает состояние приложения:
- locale
- `pageView`
- `viewMode`
- `sortMode`
- runtime defaults
- filters
- design controls
- snapshot state

## 3. Загрузка snapshot

`useSnapshot.ts` выбирает источник данных:
- локальный raw snapshot из browser storage
- demo snapshot
- browser-facing API path

Hook также:
- читает persisted snapshot и meta
- поддерживает background refresh
- использует timeout/retry
- учитывает ETag/304

## 4. Runtime contour

`runtimeContour.ts` отделяет:
- какой contour используется для auth/data
- где живёт сам SPA

Canonical поведение:
- localhost -> contour `test`, SPA base `/`
- public test -> contour `test`, SPA base `/test/`
- prod -> contour `prod`, SPA base `/`

Из contour выводятся browser-facing пути:
- test auth -> `/test/auth`
- prod auth -> `/auth`
- test data path -> `/test/api`
- prod data path -> `/api`

## 5. API-запрос

`api.ts` формирует HTTP-запрос к frontend snapshot endpoint.

Текущие особенности:
- UI-кнопки статусов влияют на отображение, а не на состав запроса
- запрос идёт по всем статусам: `work,pre_done,done,wait`
- `loadLimit` участвует в query limit
- используется защита от слишком частых запросов и retry

## 6. Нормализация

`normalize.ts` превращает сырой snapshot в UI-совместимую модель:
- сопоставляет tasks, entities, groups, people, enums
- рассчитывает derived values
- убирает с UI обязанность разбирать сырую backend-структуру

## 7. Рендер экранов

После успешной загрузки snapshot попадает в `Layout.tsx` и страницы:
- `Задачи`
- `Дизайнеры`
- `admin`
- drawer
- tooltip

## Инварианты

- UI не зависит от сырых полей backend-ответа напрямую
- runtime defaults и persisted browser state влияют на инициализацию, но не заменяют источник данных
- API/test/local режимы переключаются без новой сборки
