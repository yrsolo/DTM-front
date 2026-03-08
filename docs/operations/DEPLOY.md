# Deploy и эксплуатация

Этот документ описывает текущий deploy-контур frontend.

Для кого:
- релиз-инженер;
- frontend-разработчик, который готовит выкладку;
- инженер поддержки.

Source of truth в коде и скриптах:
- [deploy_frontend.ps1](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend.ps1)
- [deploy_frontend.cmd](n:\PROJECTS\DTM\DTM-front\scripts\deploy_frontend.cmd)
- [public.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.yaml)
- [public.prod.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.prod.yaml)

## Текущий контур

Frontend собирается как статический сайт и выкладывается в Yandex Object Storage.

Deploy включает:
- `dist/`
- runtime config `config/public.yaml`
- fallback `config/public.yam`
- пример snapshot `data/snapshot.example.json`
- `index.html`
- release metadata

## Скрипты

### `scripts/deploy_frontend.ps1`

Основной deploy-скрипт. Делает:
- сборку frontend;
- подготовку release metadata;
- загрузку артефактов в storage;
- выкладку runtime-config файлов.

### `scripts/deploy_frontend.cmd`

Windows wrapper для запуска PowerShell-скрипта из привычного `.cmd` entrypoint.

## Runtime config в deploy

Важная деталь текущей эксплуатации: на хост выгружаются оба файла:
- `/config/public.yaml`
- `/config/public.yam`

Это сделано, потому что фронт поддерживает fallback на оба пути и уже встречался реальный прод, где браузер просил `.yam`.

## Production vs test API

Runtime-переключение между продовым и тестовым API не требует отдельной сборки. Оно выполняется из UI через runtime toggle `useTestApi`, а `useSnapshot.ts` подставляет нужный base URL.

## Validation checklist перед релизом

1. `npm run build` в `apps/web` проходит.
2. В storage обновлены `public.yaml` и `public.yam`.
3. На продовом домене открывается runtime config.
4. На странице рендерятся реальные задачи, а не пустой timeline.
5. Demo mode по умолчанию соответствует ожидаемому runtime default.
6. Проверены базовые страницы: `Задачи`, `Дизайнеры`, drawer, workbench.

## Rollback

Текущая стратегия rollback простая:
- откатить статические артефакты и runtime config на предыдущую версию в storage;
- при необходимости очистить проблемный browser cache локально.

Поскольку frontend статический, rollback не требует миграций схемы внутри этого репозитория.
