# Архитектура системы

Этот документ описывает frontend как систему верхнего уровня.

Для кого:
- новый инженер;
- архитектор frontend;
- владелец проекта, которому нужен инженерный обзор без чтения всех исходников.

Source of truth в коде:
- [App.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\app\App.tsx)
- [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx)
- [TimelinePage.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\pages\TimelinePage.tsx)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)

## Назначение системы

Система строит read-only обзор задач на основе snapshot-модели, полученной либо из локального файла, либо из API. UI не редактирует данные, а нормализует их в стабильную frontend-форму и даёт несколько визуальных представлений поверх одной и той же модели.

## Runtime topology

1. Браузер загружает статический frontend.
2. `publicConfig.ts` читает runtime-конфиг из `config/public.yaml`, затем из `config/public.yam`, относительно текущего app base, а затем использует встроенный fallback YAML.
3. `Layout.tsx` поднимает runtime hub: locale, режим страницы, view mode, sort mode, фильтры, runtime defaults, design controls и key colors.
4. `useSnapshot.ts` читает локальный snapshot или делает запрос в API.
5. `normalize.ts` приводит данные к UI-совместимой snapshot-модели.
6. `TimelinePage.tsx` оркестрирует две страницы: `tasks` и `designers`.

## Главные подсистемы

### App shell

`App.tsx` остаётся тонким входом: он просто вкладывает `TimelinePage` в `Layout`.

### Runtime hub

`Layout.tsx` — центральная композиционная точка. Здесь живут:
- locale;
- page view;
- view mode;
- sort mode;
- runtime defaults;
- filters;
- design controls;
- key colors;
- состояние snapshot;
- глобальные панели управления.

### Data loading

`useSnapshot.ts` инкапсулирует выбор источника данных, загрузку, кэш, background refresh, retry и fallback на persisted snapshot.

### Rendering layer

`TimelinePage.tsx` выбирает один из двух пользовательских экранов:
- страница `Задачи` с SVG timeline;
- страница `Дизайнеры` с карточной колонночной раскладкой.

### Details and overlays

`TaskDetailsDrawer.tsx` отвечает за подробный просмотр задачи.
Tooltip-система и интерактивные оверлеи рендерятся уже на уровне конкретных страниц и компонентов.

### Design runtime

`controls.ts`, `colors.ts` и `workbenchLayout.ts` задают параметры дизайна и каноническую taxonomy крутилок, а `ControlsWorkbench.tsx` даёт runtime-редактор этих параметров.

## Границы ответственности

- Конфиг окружения читается только через `apps/web/src/config/*`.
- Нормализация данных живёт в `apps/web/src/data/normalize.ts`.
- UI работает со snapshot-представлением, а не с сырой API-структурой.
- Код рендера не должен читать `window`-конфиги напрямую, кроме оговорённых runtime слоёв.
- Backend и исходные таблицы находятся вне этого репозитория.

## Архитектурные инварианты

- Один app shell управляет двумя страницами интерфейса.
- Источник истины по данным — snapshot, а не отдельные ad hoc объекты в UI.
- Design/runtime state может храниться в браузере и переживать reload.
- Production и test API переключаются runtime-флагом, а не отдельными сборками.

## Текущие компромиссы

- Существенная часть состояния хранится в `Layout.tsx`, потому что это главный runtime hub.
- Workbench и runtime defaults объединяют продуктовые и инженерные настройки в одном слое.
- Snapshot-контур ориентирован на устойчивую работу в браузере, поэтому кэш и fallback занимают заметное место в архитектуре.
