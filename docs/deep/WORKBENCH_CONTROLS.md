# Workbench-крутилки

Этот документ фиксирует текущую каноническую структуру runtime workbench.

Для кого:
- frontend-инженер;
- дизайнер интерфейса;
- владелец, который настраивает визуальную систему без пересборки.

Source of truth в коде:
- [ControlsWorkbench.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\ControlsWorkbench.tsx)
- [workbenchLayout.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\workbenchLayout.ts)
- [controls.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\controls.ts)
- [colors.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\colors.ts)
- [runtimeDefaults.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\runtimeDefaults.ts)

## Назначение слоя

Workbench управляет тремя типами runtime-данных:
- `DesignControls`
- `KeyColors`
- `RuntimeDefaults`

Главная цель слоя:
- менять визуальную систему;
- менять runtime defaults нового сеанса;
- делать это последовательно, без дублирования control ownership между вкладками.

## Канонические вкладки

| Вкладка | Что регулирует |
| --- | --- |
| `Foundation` | базовый фон, атмосфера сцены, core accents, кнопки, навигация, task palette |
| `Surfaces` | общие карточки, table chrome, hover/scroll feedback, designers cards |
| `Timeline` | геометрия таймлайна, grid, date axis, dock panels, tooltip behavior, performance |
| `Tasks Table` | левый блок, таблица, колонки, badges, text metrics и выравнивание |
| `Drawer` | контейнер карточки задачи, календарь, drawer panel skin и drawer glow |
| `Milestones` | timeline milestone behavior, drawer milestone labels/cells, type colors |
| `Motion` | drawer/reorder animation и motion behavior |
| `Workbench` | UI самого workbench |
| `Defaults` | runtime defaults нового сеанса и их немедленное применение |

## Правила структуры

- Каждый control имеет одно каноническое место.
- Дубли в layout запрещены, кроме явного allowlist.
- Вкладки идут от глобального к частному: система -> поверхности -> основной экран -> детали -> инженерный UI.
- Группы внутри вкладки идут по закону:
  - layout / container
  - spacing / typography
  - visual skin / accents
  - behavior / optimization
- Плейсхолдерные названия вроде `Other`, `Misc`, `(2)` запрещены.

## Практические замечания

- `Surfaces` использует интерактивную panel map как инструмент для surface-зон. Это осознанный special-case UI, а не второй канонический ownership тех же controls.
- `Defaults` — это не текущий runtime state, а defaults нового сеанса.
- Persisted design values не зависят от порядка вкладок и не должны слетать при реорганизации taxonomy.
