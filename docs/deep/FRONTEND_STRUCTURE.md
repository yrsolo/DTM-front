# Структура frontend

Этот документ даёт карту исходников `apps/web/src` и показывает, где искать нужный слой.

Для кого:
- новый инженер;
- любой разработчик, которому нужно быстро найти source of truth по конкретной зоне.

Source of truth в коде:
- сама структура `apps/web/src/*`.

## Карта директорий

| Path | Ответственность | Важные файлы |
| --- | --- | --- |
| `apps/web/src/app` | Тонкая точка входа и композиция приложения | `App.tsx` |
| `apps/web/src/components` | Layout, drawer, workbench, board view и прочие UI-компоненты верхнего уровня | `Layout.tsx`, `TaskDetailsDrawer.tsx`, `ControlsWorkbench.tsx`, `DesignersBoard.tsx` |
| `apps/web/src/config` | Runtime-конфиг и чтение YAML/host-specific настроек | `publicConfig.ts` |
| `apps/web/src/data` | API-запросы, загрузка snapshot, нормализация, runtime defaults | `api.ts`, `useSnapshot.ts`, `normalize.ts`, `runtimeDefaults.ts` |
| `apps/web/src/design` | Типы и дефолты design controls, key colors, схема workbench | `controls.ts`, `colors.ts`, `workbenchLayout.ts` |
| `apps/web/src/gantt` | SVG timeline и связанные rendering-компоненты | `UnifiedTimeline.tsx`, `TaskBar.tsx`, `TasksTimeline.tsx` |
| `apps/web/src/i18n` | UI-тексты и локализация | `uiText.ts` |
| `apps/web/src/pages` | Оркестрация пользовательских страниц | `TimelinePage.tsx` |
| `apps/web/src/styles` | Глобальные CSS-переменные и стили слоёв | `globals.css` |
| `apps/web/src/utils` | Вспомогательная доменная логика | `milestoneTone.ts` |

## Entry points

- Приложение стартует из [App.tsx](../../apps/web/src/app/App.tsx).
- `App.tsx` рендерит [Layout.tsx](../../apps/web/src/components/Layout.tsx) и [TimelinePage.tsx](../../apps/web/src/pages/TimelinePage.tsx).
- `TimelinePage.tsx` уже выбирает режим `tasks` или `designers`.

## Где искать источник истины

### Конфиг и runtime defaults

- [publicConfig.ts](../../apps/web/src/config/publicConfig.ts)
- [runtimeDefaults.ts](../../apps/web/src/data/runtimeDefaults.ts)

### Snapshot и загрузка данных

- [useSnapshot.ts](../../apps/web/src/data/useSnapshot.ts)
- [api.ts](../../apps/web/src/data/api.ts)
- [normalize.ts](../../apps/web/src/data/normalize.ts)

### Timeline и геометрия

- [UnifiedTimeline.tsx](../../apps/web/src/gantt/UnifiedTimeline.tsx)
- [TaskBar.tsx](../../apps/web/src/gantt/TaskBar.tsx)

### Карточка задачи

- [TaskDetailsDrawer.tsx](../../apps/web/src/components/TaskDetailsDrawer.tsx)

### Дизайн-система и workbench

- [controls.ts](../../apps/web/src/design/controls.ts)
- [colors.ts](../../apps/web/src/design/colors.ts)
- [workbenchLayout.ts](../../apps/web/src/design/workbenchLayout.ts)
- [ControlsWorkbench.tsx](../../apps/web/src/components/ControlsWorkbench.tsx)

### Milestones и их тона

- [milestoneTone.ts](../../apps/web/src/utils/milestoneTone.ts)

## Инварианты структуры

- Вход приложения остаётся тонким.
- Чтение окружения и runtime-конфига не уходит глубоко в rendering-компоненты.
- Нормализация данных централизована.
- Основной orchestration layer находится в `Layout.tsx` и `TimelinePage.tsx`.

