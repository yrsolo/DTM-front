# Документация DTM-front

Эта папка описывает текущее состояние проекта. Источником истины для документации считаются код, актуальные runtime-конфиги и deploy-скрипты, а не исторические планы.

Структура чтения двухслойная:
- `docs/glance/` — быстрый вход и верхнеуровневые схемы;
- `docs/deep/` — углублённые технические материалы;
- `docs/archive/` — retired и historical reference docs;
- `work/archive/` — process history, а не продуктовая документация.

## Быстрый локальный запуск

Frontend запускается так:

```bash
cd apps/web
npm run dev
```

Или из корня репозитория:

```bash
npm run dev -w @dtm/web
```

Для локальной проверки используйте:

```bash
npm run build -w @dtm/web
npm run validate:schema
npm run check:mojibake
```

## С чего начать

Если нужен быстрый вход без погружения в детали:
- [glance/README.md](n:\PROJECTS\DTM\DTM-front\docs\glance\README.md)

Если нужна техническая детализация:
- [deep/README.md](n:\PROJECTS\DTM\DTM-front\docs\deep\README.md)

Если нужен historical context:
- [archive/README.md](n:\PROJECTS\DTM\DTM-front\docs\archive\README.md)

## Первый взгляд

- [PRODUCT_OVERVIEW.md](n:\PROJECTS\DTM\DTM-front\docs\glance\PRODUCT_OVERVIEW.md)
- [USER_FLOWS.md](n:\PROJECTS\DTM\DTM-front\docs\glance\USER_FLOWS.md)
- [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\glance\SYSTEM_ARCHITECTURE.md)
- [AUTH_AND_ACCESS.md](n:\PROJECTS\DTM\DTM-front\docs\glance\AUTH_AND_ACCESS.md)
- [DESIGN_SYSTEM.md](n:\PROJECTS\DTM\DTM-front\docs\glance\DESIGN_SYSTEM.md)
- [PAGES_AND_LAYOUTS.md](n:\PROJECTS\DTM\DTM-front\docs\glance\PAGES_AND_LAYOUTS.md)

## Углублённо

- [DATA_FLOW.md](n:\PROJECTS\DTM\DTM-front\docs\deep\DATA_FLOW.md)
- [FRONTEND_STRUCTURE.md](n:\PROJECTS\DTM\DTM-front\docs\deep\FRONTEND_STRUCTURE.md)
- [RUNTIME_CONFIG.md](n:\PROJECTS\DTM\DTM-front\docs\deep\RUNTIME_CONFIG.md)
- [BACKEND_AUTH_HANDOFF.md](n:\PROJECTS\DTM\DTM-front\docs\deep\BACKEND_AUTH_HANDOFF.md)
- [AUTH_DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\deep\AUTH_DEPLOY.md)
- [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\deep\WORKBENCH_CONTROLS.md)
- Полная карта: [deep/README.md](n:\PROJECTS\DTM\DTM-front\docs\deep\README.md)

## Переходный период

Старые тематические папки (`overview/`, `architecture/`, `contracts/`, `design/`, `operations/`) больше не являются основной taxonomy. Они остаются как совместимый redirect-слой, чтобы не ломать старые ссылки резко.

Если документ в старой папке показывает `Redirect`, используйте новый canonical путь.
