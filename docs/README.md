# Документация DTM-front

Эта папка описывает текущее состояние проекта. Источником истины для документации считаются код, актуальные runtime-конфиги и deploy-скрипты, а не исторические планы.

Структура чтения теперь двухслойная:
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

См. тематическую карту:
- [deep/README.md](n:\PROJECTS\DTM\DTM-front\docs\deep\README.md)

Ключевые deep docs:
- [DATA_FLOW.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\DATA_FLOW.md)
- [FRONTEND_STRUCTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\FRONTEND_STRUCTURE.md)
- [RUNTIME_CONFIG.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\RUNTIME_CONFIG.md)
- [BACKEND_AUTH_HANDOFF.md](n:\PROJECTS\DTM\DTM-front\docs\deep\BACKEND_AUTH_HANDOFF.md)
- [AUTH_DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\AUTH_DEPLOY.md)
- [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)

## Переходный период

Часть deep-доков ещё физически лежит в старых тематических папках (`architecture/`, `contracts/`, `design/`, `operations/`), но канонический маршрут чтения уже идёт через `glance/` и `deep/`.

Если документ в старой папке показывает `Redirect`, используйте новый путь. Если документ ещё не перенесён физически, его canonical место всё равно определяется через `docs/deep/README.md`.
