# Runtime-конфиг и browser persistence

Этот документ описывает runtime-конфиг, host-specific поведение и browser persistence.

Для кого:
- frontend-инженер;
- инженер поддержки;
- релиз-инженер.

Source of truth:
- `apps/web/src/config/publicConfig.ts`
- `apps/web/src/config/runtimeContour.ts`
- `apps/web/src/data/runtimeDefaults.ts`
- `apps/web/src/data/useSnapshot.ts`

## Runtime config files

Используются два исходных YAML-файла:
- `apps/web/config/public.yaml`
- `apps/web/config/public.prod.yaml`

`publicConfig.ts` сначала пытается загрузить runtime-файл относительно текущего app base:
1. `config/public.yaml`
2. `config/public.yam`

Если обе попытки неуспешны, используется встроенный YAML:
- root runtime -> `public.prod.yaml`
- localhost и public `/test/` runtime -> `public.yaml`

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

Для subpath-safe запуска публичные asset paths должны быть относительными, например:
- `local_snapshot_path: data/snapshot.example.json`

## Переключение контуров

`runtimeContour.ts` разделяет:
- `runtimeContour` -> `test | prod`
- `frontendBasePath` -> где живёт сам SPA

Canonical поведение:
- localhost -> contour `test`, frontend base `/`
- public test -> contour `test`, frontend base `/test/`
- prod -> contour `prod`, frontend base `/`

Из contour выводятся browser-facing пути:
- test auth -> `/test/auth`
- prod auth -> `/auth`
- test data path -> `/test/api`
- prod data path -> `/api`

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

Подробнее по каждому ключу см. `docs/operations/RUNTIME_STORAGE.md`.

## Инварианты

- runtime-конфиг читается из одного конфигурационного модуля;
- host-specific логика не расползается по UI-компонентам;
- runtime asset paths работают и из `/`, и из `/test/`;
- fallback на `config/public.yam` сохранён как совместимость.
