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
| `dtm.web.uiPreset.v1` | активный UI preset | `Layout.tsx` / workbench |
| `dtm.viewMode.v1` | текущий режим группировки | `Layout.tsx` |
| `dtm.sortMode.v1` | текущий режим сортировки | `Layout.tsx` |
| `dtm.locale.v1` | локаль интерфейса | `Layout.tsx` |
| `dtm.timeline.pageView.v1` | выбранная страница: `tasks` или `designers` | `TimelinePage.tsx` |
| `dtm.web.workbench.favorites.v1` | избранные controls в workbench | `ControlsWorkbench.tsx` |
| `dtm.web.workbench.tab.v2` | последняя открытая каноническая вкладка workbench | `ControlsWorkbench.tsx` |

## Как это влияет на старт приложения

- `pageView`, locale и другие runtime-параметры восстанавливаются сразу при инициализации состояния.
- persisted snapshot и meta позволяют быстро показать данные после reload.
- design controls и key colors восстанавливают внешний вид без отдельной загрузки preset.

## Что считается текущим состоянием, а что дефолтом

Важно не путать:
- persisted current state;
- defaults for new session.

Current state живёт в localStorage и применяется немедленно.
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
