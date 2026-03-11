# Документация DTM-front

Эта папка описывает текущее состояние проекта. Источником истины для документации считаются код, актуальные runtime-конфиги и deploy-скрипты, а не исторические планы.

## Что находится в `docs/`

- `overview/` — обзор продукта и пользовательские сценарии.
- `architecture/` — устройство frontend и поток данных.
- `contracts/` — API, snapshot-модель, runtime-конфиг и auth/access contracts.
- `design/` — визуальная система, страницы, workbench и milestones.
- `operations/` — deploy, browser storage и troubleshooting.

## Кому что читать

- Новый инженер:
  - [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)
  - [FRONTEND_STRUCTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\FRONTEND_STRUCTURE.md)
  - [DATA_FLOW.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\DATA_FLOW.md)
- Дизайнер, PM, владелец:
  - [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\overview\PRODUCT_OVERVIEW.md)
  - [USER_FLOWS.md](n:\PROJECTS\DTM\DTM-front\docs\overview\USER_FLOWS.md)
  - [PAGES_AND_LAYOUTS.md](n:\PROJECTS\DTM\DTM-front\docs\design\PAGES_AND_LAYOUTS.md)
- Разработчик UI:
  - [DESIGN_SYSTEM.md](n:\PROJECTS\DTM\DTM-front\docs\design\DESIGN_SYSTEM.md)
  - [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)
  - [MILESTONES_AND_COLORS.md](n:\PROJECTS\DTM\DTM-front\docs\design\MILESTONES_AND_COLORS.md)
- Релиз и эксплуатация:
  - [DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\DEPLOY.md)
  - [AUTH_DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\AUTH_DEPLOY.md)
  - [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md)
  - [TROUBLESHOOTING.md](n:\PROJECTS\DTM\DTM-front\docs\operations\TROUBLESHOOTING.md)

## Карта документации

### Обзор

- [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\overview\PRODUCT_OVERVIEW.md)
- [USER_FLOWS.md](n:\PROJECTS\DTM\DTM-front\docs\overview\USER_FLOWS.md)

### Архитектура

- [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)
- [FRONTEND_STRUCTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\FRONTEND_STRUCTURE.md)
- [DATA_FLOW.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\DATA_FLOW.md)

### Контракты

- [API_CONTRACT.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\API_CONTRACT.md)
- [SNAPSHOT_MODEL.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\SNAPSHOT_MODEL.md)
- [RUNTIME_CONFIG.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\RUNTIME_CONFIG.md)
- [AUTH_AND_ACCESS.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\AUTH_AND_ACCESS.md)
- [BACKEND_AUTH_HANDOFF.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\BACKEND_AUTH_HANDOFF.md)

### Дизайн

- [DESIGN_SYSTEM.md](n:\PROJECTS\DTM\DTM-front\docs\design\DESIGN_SYSTEM.md)
- [PAGES_AND_LAYOUTS.md](n:\PROJECTS\DTM\DTM-front\docs\design\PAGES_AND_LAYOUTS.md)
- [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)
- [MILESTONES_AND_COLORS.md](n:\PROJECTS\DTM\DTM-front\docs\design\MILESTONES_AND_COLORS.md)

### Эксплуатация

- [DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\DEPLOY.md)
- [AUTH_DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\AUTH_DEPLOY.md)
- [AUTH_TROUBLESHOOTING.md](n:\PROJECTS\DTM\DTM-front\docs\operations\AUTH_TROUBLESHOOTING.md)
- [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md)
- [TROUBLESHOOTING.md](n:\PROJECTS\DTM\DTM-front\docs\operations\TROUBLESHOOTING.md)

## Где искать источник истины

- Продукт и режимы интерфейса:
  - [TimelinePage.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\pages\TimelinePage.tsx)
  - [DesignersBoard.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\DesignersBoard.tsx)
- Архитектура и runtime hub:
  - [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx)
  - [App.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\app\App.tsx)
- Данные и загрузка:
  - [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)
  - [api.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\api.ts)
  - [normalize.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\normalize.ts)
- Runtime config:
  - [publicConfig.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\config\publicConfig.ts)
  - [runtimeDefaults.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\runtimeDefaults.ts)
- Дизайн и крутилки:
  - [controls.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\controls.ts)
  - [colors.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\colors.ts)
  - [workbenchLayout.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\design\workbenchLayout.ts)
- Milestone mapping:
  - [milestoneTone.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\utils\milestoneTone.ts)

## С чего начать

- Если нужно быстро понять проект:
  - [README.md](n:\PROJECTS\DTM\DTM-front\README.md)
  - [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\overview\PRODUCT_OVERVIEW.md)
- Если нужно вносить изменения в код:
  - [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)
  - [DATA_FLOW.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\DATA_FLOW.md)
  - [RUNTIME_CONFIG.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\RUNTIME_CONFIG.md)
- Если нужно настраивать внешний вид:
  - [DESIGN_SYSTEM.md](n:\PROJECTS\DTM\DTM-front\docs\design\DESIGN_SYSTEM.md)
  - [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)
