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
- [glance/README.md](glance/README.md)

Если нужна техническая детализация:
- [deep/README.md](deep/README.md)

Если нужен historical context:
- [archive/README.md](archive/README.md)

## Первый взгляд

- [PRODUCT_OVERVIEW.md](glance/PRODUCT_OVERVIEW.md)
- [USER_FLOWS.md](glance/USER_FLOWS.md)
- [SYSTEM_ARCHITECTURE.md](glance/SYSTEM_ARCHITECTURE.md)
- [AUTH_AND_ACCESS.md](glance/AUTH_AND_ACCESS.md)
- [DESIGN_SYSTEM.md](glance/DESIGN_SYSTEM.md)
- [PAGES_AND_LAYOUTS.md](glance/PAGES_AND_LAYOUTS.md)

## Углублённо

- [DATA_FLOW.md](deep/DATA_FLOW.md)
- [FRONTEND_STRUCTURE.md](deep/FRONTEND_STRUCTURE.md)
- [RUNTIME_CONFIG.md](deep/RUNTIME_CONFIG.md)
- [BACKEND_AUTH_HANDOFF.md](deep/BACKEND_AUTH_HANDOFF.md)
- [AUTH_DEPLOY.md](deep/AUTH_DEPLOY.md)
- [WORKBENCH_CONTROLS.md](deep/WORKBENCH_CONTROLS.md)
- Полная карта: [deep/README.md](deep/README.md)

