# Поток данных

Этот документ описывает путь данных от runtime-конфига до конкретных экранов.

Для кого:
- frontend-инженер;
- инженер поддержки;
- архитектор.

Source of truth в коде:
- [publicConfig.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\config\publicConfig.ts)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)
- [api.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\api.ts)
- [normalize.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\normalize.ts)
- [TimelinePage.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\pages\TimelinePage.tsx)

## 1. Загрузка runtime-конфига

`publicConfig.ts` читает конфиг в таком порядке:
1. `/config/public.yaml`
2. `/config/public.yam`
3. встроенный fallback YAML

Fallback выбирается по host:
- production host использует `public.prod.yaml`
- остальные окружения используют `public.yaml`

Из runtime-конфига приходят:
- базовый URL API;
- frontend path API;
- timeout/retry;
- refresh interval;
- лимиты и другие defaults.

## 2. Инициализация runtime state

`Layout.tsx` поднимает состояние приложения:
- locale;
- `pageView`;
- `viewMode`;
- `sortMode`;
- runtime defaults;
- filters;
- design controls и key colors;
- snapshot state.

Часть значений инициализируется из localStorage, часть из runtime defaults.

## 3. Загрузка snapshot

`useSnapshot.ts` выбирает источник данных:
- локальный raw snapshot из browser storage;
- demo snapshot;
- API.

Также hook:
- читает persisted snapshot и meta;
- поддерживает background refresh;
- использует timeout/retry;
- учитывает ETag/304;
- может переключать API между prod и test.

## 4. API-запрос

`api.ts` формирует HTTP-запрос к frontend snapshot endpoint.

Текущие особенности:
- UI-кнопки статусов влияют на отображение, а не на состав запроса;
- запрос уходит сразу по всем статусам: `work,pre_done,done,wait`;
- `loadLimit` участвует в query limit;
- используется защита от слишком частых запросов и повторные попытки.

## 5. Нормализация

`normalize.ts` превращает сырой snapshot в UI-совместимую модель:
- сопоставляет tasks, entities, groups, people, enums;
- рассчитывает удобные derived values;
- убирает с UI обязанность разбирать сырую backend-структуру.

Именно этот слой реализует правило из `AGENTS.md`: UI должен работать со стабильной snapshot boundary.

## 6. Переход в UI state

После успешной загрузки snapshot попадает в `Layout.tsx` и `TimelinePage.tsx`, где уже используется как единый источник данных для:
- страницы `Задачи`;
- страницы `Дизайнеры`;
- drawer;
- tooltip;
- связанных фильтров и группировок.

## 7. Рендер экранов

### Страница `Задачи`

Использует timeline-представление:
- строки;
- left panel;
- pinned date scale;
- task bars;
- tooltip;
- drawer.

### Страница `Дизайнеры`

Использует board-представление:
- колонки по дизайнерам;
- карточки задач;
- hover-tooltip с milestones.

## Local cache и persisted snapshot

Используемые persisted данные:
- `dtm.snapshot.v1`
- `dtm.snapshot.meta`
- `dtm.web.localSnapshotRaw.v1`

Назначение:
- переживать reload;
- дать fallback при временной недоступности API;
- хранить локальный snapshot для ручной работы.

## Display limit vs load limit

Сейчас есть два разных ограничения:
- `loadLimit` — сколько задач запрашивать у API;
- `displayLimit` — сколько задач показывать на экране.

Это разделение нужно сохранять в документации и коде: уменьшение display limit не должно автоматически означать уменьшение объёма кэшируемых данных.

## Cache / revalidate behavior

Текущая модель ближе к SWR-подобному поведению:
- сначала можно показать persisted snapshot;
- затем выполнить фоновое обновление;
- при удачном ответе обновить snapshot и meta;
- при 304 не перерисовывать данные без необходимости.

## Инварианты

- UI не должен зависеть от сырых полей backend-ответа напрямую.
- Runtime defaults и persisted browser state влияют на инициализацию, но не заменяют источник данных.
- API/test/local режимы должны переключаться без новой сборки.
