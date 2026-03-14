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
6. selector layer вычисляет presentation-specific наборы:
   - `myTasks`
   - `allTasks`
   - mobile agenda items
   - current person link
7. attachment metadata, если backend их публикует, проходят через тот же normalize path внутри `tasks[].attachments`.
8. страницы `Tasks`, `Designers`, Mini App screens, drawer и tooltips рендерятся уже на нормализованных данных.

## Локальный режим

`localhost` считается test contour для auth/api, но сам SPA живёт на `/`.
Это позволяет интерактивно править дизайн локально и одновременно работать против test service contour на боевом домене.

## Mini App specifics

- route `/app` и `/test/app` используют тот же `useSnapshot.ts`, что и desktop;
- Mini App не делает отдельный запрос “только мои задачи”;
- browser/webview получает общий snapshot через existing `bff`;
- фильтрация `mine / all` происходит client-side в selector layer;
- auth linkage даёт frontend `currentPersonId`, но не меняет состав загруженного snapshot;
- Mini App auth bootstrap может auto-heal linkage через auth contour, но это влияет только на session/person resolution, а не на состав snapshot payload;
- если Telegram linkage не восстановился, frontend показывает explicit unlinked state вместо silent empty `mine`.

## Task attachments specifics

- attachment metadata не lazy-loadятся отдельно: они приходят в общем snapshot payload;
- attachment panel в drawer свёрнута по умолчанию, но это UX decision, а не server-load optimization;
- read path uses payload links only;
- admin upload flow использует отдельный browser call в backend-owned `/ops/admin/task-attachments/*` как explicit exception этой волны;
- finalize does not mutate frontend snapshot directly: UI ждёт следующего snapshot refresh.

## Cache / persistence

SWR-like поведение, snapshot cache и runtime defaults живут в browser storage и описаны отдельно в `docs/deep/RUNTIME_CONFIG.md` и `docs/deep/RUNTIME_STORAGE.md`.

