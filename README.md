# Спонсорские ТНТ

Веб-интерфейс для планирования и навигации по спонсорским задачам ТНТ. Проект собирает snapshot из локального JSON или API, показывает задачи в виде плотного таймлайна и карточек по дизайнерам, а также даёт runtime-настройку визуальной системы без пересборки.

## Что умеет продукт сейчас

- Показывает две рабочие страницы: `Задачи` и `Дизайнеры`.
- Загружает данные из локального snapshot, demo snapshot или API.
- Поддерживает фильтрацию, группировку, масштабирование таймлайна и открытие карточки задачи.
- Имеет встроенный workbench для настройки геометрии, цветов, milestones, анимаций и runtime defaults.
- Сохраняет пользовательское состояние в браузере: режимы, пресеты, локальный кэш данных и текущие настройки.

## Основные режимы

### `Задачи`

Основной рабочий экран: левый блок со строками, плотный таймлайн, pinned-шапки, zoom/filter dock, переключатели группировки, tooltip и карточка задачи.

### `Дизайнеры`

Экран с колонками по дизайнерам. Внутри каждой колонки лежат карточки задач с цветовой подкраской, а при наведении открывается tooltip с milestones, менеджером и history.

## Ключевые особенности интерфейса

- SVG-таймлайн с ручным управлением масштабом и прокруткой.
- Отдельная карточка задачи с календарём, milestones и метаданными.
- Workbench-крутилки для material, panels, timeline, milestones, drawer, palette и runtime defaults.
- Поддержка локального, тестового и продового API-контуров.
- Runtime-конфиг через `apps/web/config/public.yaml` и `apps/web/config/public.prod.yaml`.

## Быстрый старт

### Требования

- Node.js 18+
- npm

### Установка

```bash
npm install
```

### Локальный запуск

```bash
cd apps/web
npm run dev
```

Альтернатива из корня репозитория:

```bash
npm run dev -w @dtm/web
```

### Локальная проверка

Отдельный `npm test` в проекте пока не настроен. Для локальной проверки используйте:

```bash
npm run build -w @dtm/web
npm run validate:schema
npm run check:mojibake
```

По умолчанию приложение читает runtime-конфиг из `/config/public.yaml`, а fallback-конфиг берёт из:

- [public.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.yaml)
- [public.prod.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.prod.yaml)

Важно:
- prod frontend работает в корне `https://dtm.solofarm.ru/`
- public test frontend работает в `https://dtm.solofarm.ru/test/`
- локальный frontend живёт на `/`, но auth/api использует test contour
- runtime config резолвится относительно текущего app base, а не только из корня домена

## Где читать дальше

- Общая карта документации: [docs/README.md](n:\PROJECTS\DTM\DTM-front\docs\README.md)
- Архитектура: [SYSTEM_ARCHITECTURE.md](n:\PROJECTS\DTM\DTM-front\docs\architecture\SYSTEM_ARCHITECTURE.md)
- Контракты данных и runtime config: [RUNTIME_CONFIG.md](n:\PROJECTS\DTM\DTM-front\docs\contracts\RUNTIME_CONFIG.md)
- Дизайн-система и workbench: [WORKBENCH_CONTROLS.md](n:\PROJECTS\DTM\DTM-front\docs\design\WORKBENCH_CONTROLS.md)
- Deploy и эксплуатация: [DEPLOY.md](n:\PROJECTS\DTM\DTM-front\docs\operations\DEPLOY.md)

## Технологии

- React 18
- TypeScript
- Vite
- SVG timeline rendering
- LocalStorage persistence
- YAML runtime config
- Yandex Object Storage deploy

## Теги

`#react #typescript #vite #svg #gantt #design-system #runtime-config #localstorage #frontend #yandex-object-storage`
