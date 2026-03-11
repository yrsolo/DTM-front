# Deploy и эксплуатация

Этот документ описывает текущий deploy-контур frontend.

Для кого:
- релиз-инженер;
- frontend-разработчик;
- инженер поддержки.

Source of truth:
- `scripts/deploy_frontend.ps1`
- `scripts/deploy_frontend.sh`
- `.github/workflows/deploy_frontend.yml`
- `apps/web/config/public.yaml`
- `apps/web/config/public.prod.yaml`

## Контуры

Frontend публикуется в один bucket `dtm-front`.

Схема публикации:
- `prod` -> `https://dtm.solofarm.ru/`
- `test` -> `https://dtm.solofarm.ru/test/`

Deploy включает:
- `apps/web/dist/`
- всю папку `apps/web/public/config/`
- runtime aliases `config/public.yaml` и `config/public.yam`
- `data/snapshot.example.json`
- `index.html`
- release metadata в `releases/prod/*` и `releases/test/*`

## Скрипты

### `scripts/deploy_frontend.ps1`
Основной локальный deploy-скрипт:
- собирает frontend;
- синкает статические артефакты;
- синкает весь `public/config`;
- накладывает target-specific runtime config;
- публикует `index.html` с `no-cache`.

### `scripts/deploy_frontend.cmd` / `scripts/deploy_frontend_test.cmd`
Локальный test deploy в подпуть `/test/`.

### `scripts/deploy_frontend_prod.cmd`
Локальный prod deploy в корень сайта.

### `.github/workflows/deploy_frontend.yml`
GitHub Actions deploy:
- `push` в `dev` -> автоматически публикует `test`
- `workflow_dispatch` -> ручной deploy в `prod` или `test`
- upload работает в недеструктивном режиме `clear=false`, потому что bucket общий для `prod` и `test`

## Runtime config

На каждый target выгружаются:
- `config/public.yaml`
- `config/public.yam`

Это сохраняет совместимость с окружениями, где браузер или reverse proxy уже запрашивали `.yam`.

Публикуется весь каталог `apps/web/public/config/`, поэтому `config/design-controls.json` и будущие вложенные конфиги уезжают автоматически.

## Backend-owned routes

Эта задача не владеет реализацией следующих путей:
- `https://dtm.solofarm.ru/api/*`
- `https://dtm.solofarm.ru/info/*`
- `https://dtm.solofarm.ru/test/api/*`
- `https://dtm.solofarm.ru/test/info/*`

Frontend только адресует эти browser-facing пути. Их серверная реализация принадлежит backend-контуру.

## Validation checklist

1. `npm run build -w @dtm/web` проходит.
2. Для target опубликованы `config/public.yaml` и `config/public.yam`.
3. Для test deploy артефакты лежат под `test/`, а prod не затронут.
4. На `https://dtm.solofarm.ru/` и `https://dtm.solofarm.ru/test/` грузятся frontend и runtime config.
5. Проверены базовые страницы: `Задачи`, `Дизайнеры`, `admin` route.

## Rollback

Rollback остаётся файловым:
- откатить статические артефакты и runtime config в bucket;
- при необходимости очистить browser cache локально.
