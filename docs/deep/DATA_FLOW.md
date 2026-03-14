# Data Flow

Назначение:
- объяснить полный цикл данных от загрузки до рендера.

Source of truth:
- `apps/web/src/config/publicConfig.ts`
- `apps/web/src/data/useSnapshot.ts`
- `apps/web/src/data/api.ts`
- `apps/web/src/data/normalize.ts`
- `apps/web/src/pages/*`

## Основной поток

1. `publicConfig.ts` загружает runtime config относительно текущего app base.
2. `runtimeContour.ts` определяет:
   - contour (`test | prod`)
   - frontend base path
   - browser-facing auth/api paths
3. `useSnapshot.ts` выбирает источник данных:
   - local snapshot
   - demo snapshot
   - API
4. `api.ts` строит browser URL:
   - test auth -> `/test/ops/auth`
   - prod auth -> `/ops/auth`
   - test data path -> `/test/ops/bff`
   - prod data path -> `/ops/bff`
5. `normalize.ts` приводит payload к UI-friendly shape.
6. страницы `Tasks`, `Designers`, drawer и tooltips рендерятся уже на нормализованных данных.

## Локальный режим

`localhost` считается test contour для auth/api, но сам SPA живёт на `/`.
Это позволяет интерактивно править дизайн локально и одновременно работать против test service contour на боевом домене.

## Cache / persistence

SWR-like поведение, snapshot cache и runtime defaults живут в browser storage и описаны отдельно в `docs/deep/RUNTIME_CONFIG.md` и `docs/deep/RUNTIME_STORAGE.md`.

