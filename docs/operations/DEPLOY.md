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
- `config/deploy.yaml`
- `apps/web/config/public.yaml`
- `apps/web/config/public.prod.yaml`

## Контуры

Frontend публикуется в два bucket:
- prod -> `dtm-front`
- test -> `dtm-front-test`

Схема публикации:
- `prod` -> `https://dtm.solofarm.ru/`
- `test` -> `https://dtm.solofarm.ru/test/`

Deploy включает:
- `apps/web/dist/`
- весь каталог `apps/web/public/config/`
- runtime aliases `config/public.yaml` и `config/public.yam`
- `data/snapshot.example.json`
- `index.html`
- release metadata в bucket текущего target

## Скрипты

### `scripts/deploy_frontend.ps1`
Основной локальный deploy-скрипт:
- собирает frontend;
- синкает статические артефакты в bucket нужного контура;
- синкает весь `public/config`;
- накладывает target-specific runtime config;
- публикует `index.html` с `no-cache`.

### `scripts/deploy_frontend.cmd` / `scripts/deploy_frontend_test.cmd`
Локальный test deploy в bucket `dtm-front-test`.

### `scripts/deploy_frontend_prod.cmd`
Локальный prod deploy в bucket `dtm-front`.

### `.github/workflows/deploy_frontend.yml`
GitHub Actions deploy:
- `push` в `dev` -> автоматически публикует `test`
- `workflow_dispatch` -> ручной deploy в `prod` или `test`
- test и prod больше не делят один bucket

## Runtime config

На каждый target публикуются:
- `config/public.yaml`
- `config/public.yam`

Публикуется весь каталог `apps/web/public/config/`, поэтому `config/design-controls.json` и будущие вложенные конфиги уезжают автоматически.

## Service namespace

Frontend и auth адресуют только новую service-схему:
- prod auth -> `https://dtm.solofarm.ru/ops/auth/*`
- prod api -> `https://dtm.solofarm.ru/ops/api/*`
- test auth -> `https://dtm.solofarm.ru/test/ops/auth/*`
- test api -> `https://dtm.solofarm.ru/test/ops/api/*`
- shared grafana -> `https://dtm.solofarm.ru/ops/grafana/*`

`/ops/admin/*`, `/ops/telegram*`, `/ops/api/*` и test-аналоги считаются backend-owned routes. Frontend только использует их публичный контракт.

## Validation checklist

1. `npm run build -w @dtm/web` проходит.
2. Для target опубликованы `config/public.yaml` и `config/public.yam`.
3. Для test deploy артефакты уходят только в `dtm-front-test`, prod bucket не затронут.
4. На `https://dtm.solofarm.ru/` и `https://dtm.solofarm.ru/test/` грузятся frontend и runtime config.
5. Проверены базовые страницы: `Задачи`, `Дизайнеры`, `admin` route.

## Rollback

Rollback остаётся файловым:
- откатить статические артефакты и runtime config в bucket нужного контура;
- при необходимости очистить browser cache локально.
