# Runtime-конфиг и browser persistence

Этот документ описывает runtime-конфиг, host-specific поведение и browser persistence.

Для кого:
- frontend-инженер;
- инженер поддержки;
- релиз-инженер.

Source of truth в коде:
- [publicConfig.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\config\publicConfig.ts)
- [runtimeDefaults.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\runtimeDefaults.ts)
- [Layout.tsx](n:\PROJECTS\DTM\DTM-front\apps\web\src\components\Layout.tsx)
- [useSnapshot.ts](n:\PROJECTS\DTM\DTM-front\apps\web\src\data\useSnapshot.ts)

## Runtime config files

Используются два исходных YAML-файла:
- [public.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.yaml)
- [public.prod.yaml](n:\PROJECTS\DTM\DTM-front\apps\web\config\public.prod.yaml)

`publicConfig.ts` сначала пытается загрузить runtime-файл относительно текущего app base:
1. `config/public.yaml`
2. `config/public.yam`

Если обе попытки неуспешны, используется встроенный YAML:
- root runtime -> `public.prod.yaml`
- локальный режим и `/test/` runtime -> `public.yaml`

## Что лежит в runtime config

Типичные параметры:
- `api_base_url`
- `api_base_url_prod`
- `api_base_url_test`
- `api_frontend_path`
- `api_statuses`
- `api_include_people`
- `api_limit`
- `api_timeout_ms`
- `api_retry_count`
- `api_retry_delay_ms`
- `api_refresh_interval_ms`
- `local_snapshot_path`

Для subpath-safe запуска значения публичных asset paths должны быть относительными, например:
- `local_snapshot_path: data/snapshot.example.json`

## Runtime defaults

`runtimeDefaults.ts` определяет дефолты нового сеанса. На текущий момент важные значения такие:
- demo mode: `false`
- display limit: `30`
- load limit: `100`
- refresh interval: `60` секунд
- date filter enabled: `false`
- statuses by default:
  - `work = true`
  - `pre_done = true`
  - `done = false`
  - `wait = false`

## Current session vs defaults for new session

Важно разделять два слоя:

### Current session behavior

Это текущее состояние UI, которое пользователь меняет во время работы:
- активный page view;
- locale;
- filters;
- design controls;
- key colors;
- текущий snapshot cache.

### Defaults for new session

Это значения, которые применяются при следующем чистом старте или после загрузки preset/runtime defaults.

Workbench-вкладка `По умолчанию` должна задавать именно этот слой, а не обязательно переписывать текущее активное состояние сразу.

## Переключение API-контуров

`useSnapshot.ts` использует runtime toggle `useTestApi`, но сами URL теперь берутся из публичного конфига:
- `api_base_url_prod`
- `api_base_url_test`

`api_base_url` остаётся backward-compatible общим полем и fallback-значением, если отдельные prod/test поля не заданы.

## Browser storage keys

Ключи, реально используемые текущим кодом:
- `dtm.web.localSnapshotRaw.v1`
- `dtm.snapshot.v1`
- `dtm.snapshot.meta`
- `dtm.web.keyColors.v1`
- `dtm.web.designControls.v1`
- `dtm.web.uiPreset.v1`
- `dtm.viewMode.v1`
- `dtm.sortMode.v1`
- `dtm.locale.v1`
- `dtm.timeline.pageView.v1`
- `dtm.web.workbench.favorites.v1`

Подробнее по каждому ключу см. [RUNTIME_STORAGE.md](n:\PROJECTS\DTM\DTM-front\docs\operations\RUNTIME_STORAGE.md).

## Инициализация состояния

При старте приложения часть состояния восстанавливается из localStorage сразу через lazy state initialization, чтобы избежать лишнего промежуточного рендера. Это уже касается как минимум `pageView` и других runtime-настроек.

## Инварианты

- runtime-конфиг должен читаться из одного конфигурационного модуля;
- host-specific логика не должна расползаться по rendering-компонентам;
- persisted browser state не должен подменять собой API-контракт, только дополнять его;
- fallback на `config/public.yam` сохранён как совместимость с уже развернутым окружением.
- runtime asset paths должны корректно работать и из `/`, и из `/test/`.
