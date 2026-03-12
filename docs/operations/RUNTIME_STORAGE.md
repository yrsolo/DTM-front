# Browser storage и runtime persistence

Этот документ собирает browser storage keys и объясняет, как они влияют на запуск приложения.

Для кого:
- frontend-инженер;
- инженер поддержки;
- релиз-инженер, разбирающийся в runtime-поведении после reload.

Source of truth в коде:
- [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)
- `rg "localStorage|sessionStorage" apps/web/src`

## Ключи localStorage

| Key | Что хранит | Кто читает / пишет |
| --- | --- | --- |
| `dtm.web.localSnapshotRaw.v1` | локальный raw snapshot JSON | `useSnapshot.ts` |
| `dtm.snapshot.v1` | последний успешный нормализованный snapshot | `useSnapshot.ts` |
| `dtm.snapshot.meta` | meta по snapshot | `useSnapshot.ts` |
| `dtm.web.keyColors.v1` | текущие key colors | `Layout.tsx` / workbench |
| `dtm.web.designControls.v1` | текущие design controls | `Layout.tsx` / workbench |
| `dtm.web.uiPreset.v1` | legacy combined preset для fallback-миграции | `Layout.tsx` / workbench |
| `dtm.web.preset.activeColor.v1` | id активного color preset | `presets.ts` / workbench |
| `dtm.web.preset.activeLayout.v1` | id активного layout preset | `presets.ts` / workbench |
| `dtm.viewMode.v1` | текущий режим группировки | `Layout.tsx` |
| `dtm.sortMode.v1` | текущий режим сортировки | `Layout.tsx` |
| `dtm.locale.v1` | локаль интерфейса | `Layout.tsx` |
| `dtm.timeline.pageView.v1` | выбранная страница: `tasks` или `designers` | `TimelinePage.tsx` |
| `dtm.web.workbench.favorites.v1` | избранные controls в workbench | `ControlsWorkbench.tsx` |
| `dtm.web.workbench.tab.v2` | последняя открытая каноническая вкладка workbench | `ControlsWorkbench.tsx` |

## Как это влияет на старт приложения

- `pageView`, locale и другие runtime-параметры восстанавливаются сразу при инициализации состояния.
- persisted snapshot и meta позволяют быстро показать данные после reload.
- design controls и key colors восстанавливают внешний вид независимо друг от друга.
- active preset ids помогают после reload вернуть выбранный color/layout preset без смешивания слоёв.
- legacy combined preset читается только как fallback, чтобы старые сохранения не сломались.

## Что считается текущим состоянием, а что дефолтом

Важно не путать:
- persisted current state;
- defaults for new session.

Current state живёт в localStorage и применяется немедленно.
Color и layout теперь хранятся раздельно: применение color preset не должно менять layout, и наоборот.
Defaults нового сеанса задаются отдельно через runtime defaults и используются как базовый слой при чистом старте.

## Поведение при пустом или битом storage

Если browser storage пуст или повреждён:
- приложение должно стартовать на runtime defaults;
- при отсутствии persisted snapshot запрашивать свежие данные;
- при невозможности распарсить сохранённый JSON использовать безопасный fallback.

## Практический совет для диагностики

При проблемах интерфейса проверяйте в DevTools:
- нет ли устаревших `dtm.web.designControls.v1`;
- не включён ли неожиданно demo mode в persisted state;
- есть ли валидные `dtm.snapshot.v1` и `dtm.snapshot.meta`.
