# Deploy и эксплуатация

Этот документ описывает текущий deploy-контур frontend.

Для кого:
- релиз-инженер;
- frontend-разработчик, который готовит выкладку;
- инженер поддержки.

Source of truth в коде и скриптах:
- [deploy_frontend.ps1](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend.ps1)
- [deploy_frontend.cmd](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend.cmd)
- [deploy_frontend_test.cmd](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend_test.cmd)
- [deploy_frontend_prod.cmd](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend_prod.cmd)
- [public.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.yaml)
- [public.prod.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.prod.yaml)
- [deploy_frontend.yml](n:\PROJECTS\DTM\DTM-front\.github\workflows\deploy_frontend.yml)

## Текущий контур

Frontend собирается как статический сайт и выкладывается в один bucket Yandex Object Storage `dtm-front`.

Схема публикации:
- `prod` -> корень сайта `https://dtm.solofarm.ru/`
- `test` -> подпуть `https://dtm.solofarm.ru/test/`

Deploy включает:
- `dist/`
- всю папку `apps/web/public/config/` как публичный каталог `config/`
- runtime config aliases `config/public.yaml` и `config/public.yam` поверх общего `config/`
- пример snapshot `data/snapshot.example.json`
- `index.html`
- release metadata в `releases/prod/*` или `releases/test/*`

## Скрипты

### `scripts/deploy_frontend.ps1`

Основной deploy-скрипт. Делает:
- сборку frontend;
- подготовку release metadata;
- загрузку артефактов в storage;
- выкладку runtime-config файлов.

### `scripts/deploy_frontend.cmd` / `scripts/deploy_frontend_test.cmd`

Локальный test deploy в подпуть `/test/`.

### `scripts/deploy_frontend_prod.cmd`

Локальный prod deploy в корень сайта.

### `.github/workflows/deploy_frontend.yml`

GitHub Actions deploy:
- `push` в `dev` -> автоматически публикует `test`
- `workflow_dispatch` -> ручной deploy в `prod` или `test`
- для Actions используется OIDC через `yc-actions/yc-obj-storage-upload`, без AWS access keys как обязательной схемы
- Actions-upload работает в недеструктивном режиме: `clear=false` для всех target, потому что bucket общий для `prod` и `test`, и очистка через action не считается безопасной для shared bucket

## Runtime config в deploy

Важная деталь текущей эксплуатации: на каждый target выгружаются оба файла:
- `config/public.yaml`
- `config/public.yam`

Это сделано, потому что фронт поддерживает fallback на оба пути и уже встречался реальный прод, где браузер просил `.yam`.

При этом deploy больше не перечисляет конфиги вручную. Публикуется весь каталог `apps/web/public/config/`, поэтому такие файлы как `config/design-controls.json` и будущие вложенные конфиги попадают в сайт автоматически без правки deploy-скриптов.

## Production vs test API

Runtime-переключение между продовым и тестовым API не требует отдельной сборки. Оно выполняется из UI через runtime toggle `useTestApi`, а `useSnapshot.ts` подставляет нужный base URL.

## Validation checklist перед релизом

1. `npm run build` в `apps/web` проходит.
2. Для target опубликованы `config/public.yaml` и `config/public.yam`.
3. Для test deploy артефакты лежат под `test/`, а prod не затронут.
4. На `https://dtm.solofarm.ru/` и `https://dtm.solofarm.ru/test/` грузятся данные и runtime config.
5. Demo mode по умолчанию соответствует ожидаемому runtime default.
6. Проверены базовые страницы: `Задачи`, `Дизайнеры`, drawer, workbench.

## Важное ограничение текущего GitHub deploy

GitHub Actions сейчас не делает очистку старых файлов в target-path. Это сознательное решение:
- bucket один и общий для `prod` и `test`;
- destructive clear в upload-action может затронуть не только свой префикс;
- поэтому автоматический deploy в CI только добавляет/обновляет файлы внутри своего target.

Если потребуется безопасная очистка только `test/` или только корня `prod`, её нужно делать отдельным target-aware sync-скриптом, а не флагом `clear` в shared-bucket upload action.

## Rollback

Текущая стратегия rollback простая:
- откатить статические артефакты и runtime config на предыдущую версию в storage;
- при необходимости очистить проблемный browser cache локально.

Поскольку frontend статический, rollback не требует миграций схемы внутри этого репозитория.
