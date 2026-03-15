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
- backend flow split into two planes:
  - control plane: browser calls auth facade routes and backend enqueues async mutations;
  - data plane: binary upload goes directly from browser to Object Storage, while `view` / `download` go through backend read routes and redirect to short-lived storage URLs;
- browser control-plane routes go through the auth facade:
  - `POST /ops/auth/attachments/request-upload`
  - `POST /ops/auth/attachments/finalize`
  - `POST /ops/auth/attachments/delete`
  - `GET /ops/auth/attachments/jobs/{job_id}`
  - `GET /ops/auth/attachments/{attachment_id}/view`
  - `GET /ops/auth/attachments/{attachment_id}/download`
  - test contour uses the same paths under `/test/ops/auth/...`;
- admin upload flow follows the backend attachment contract:
  1. request upload contract through auth facade;
  2. send direct browser `PUT` to the returned presigned `uploadUrl`;
  3. finalize through auth facade;
  4. poll `jobs/{job_id}` until terminal `success`;
  5. only then refetch snapshot/task state;
- direct upload contract must be used exactly as returned:
  - exact `uploadUrl`;
  - exact method from the contract, currently `PUT`;
  - exact signed headers, currently `Content-Type`;
- direct `PUT` success does not make the file visible yet;
- `finalize` success with `202` does not make the file visible yet;
- attachment is ready only after terminal `jobs/{job_id} = success` and a refetch shows it in `tasks[].attachments`;
- attachment harness and browser polling can use existing auth facade route `/ops/auth/attachments/jobs/{job_id}` and `/test/ops/auth/attachments/jobs/{job_id}` instead of a new namespace;
- finalize does not mutate frontend snapshot directly: UI waits for backend job success first and then performs the refetch.
- delete follows the same async model:
  - call `delete` through auth facade;
  - poll `jobs/{job_id}`;
  - refetch task/frontend payload after terminal `success`;
  - only then treat attachment as removed in UI.
- read flow uses browser-safe auth facade routes; frontend must not open raw backend `/ops/api/task-attachments/*` or `/api/task-attachments/*` links directly in the browser.

## Attachment runtime confidence

- `test` contour is confirmed end-to-end through backend-owned `/test/ops/info` attachment harness;
- `prod` is expected to use the same contract, but still needs its own live smoke before claiming the same confidence level.

Practical rule:
- if `/test/ops/info` attachment harness passes on the same contour, new failures are more likely to be in auth facade forwarding, browser request handling, frontend polling/refetch logic, or violating the signed upload contract;
- do not assume a backend runtime bug first while the harness passes for the same contour.

## Attachment troubleshooting order

When attachment issues are reported on `test`, use this order:

1. reproduce the same scenario in `/test/ops/info`;
2. if `/test/ops/info` fails, treat it as backend/auth/storage contour issue;
3. if `/test/ops/info` passes but product UI fails, treat it as frontend/auth integration issue unless proven otherwise.

## Attachment diagnostics and operator evidence

- `request-upload` may return structured JSON errors with:
  - `error.code`
  - `error.message`
  - `error.details.step = request-upload`
  - `error.details.reason`
- upload contract may include `diagnostics` describing:
  - signed method
  - signed `Content-Type`
  - required headers
  - upload URL host/path
  - expiry
  - whether browser upload may require preflight/CORS
- when diagnosing direct upload failures, compare:
  - exact request method;
  - exact signed headers;
  - upload host/path from diagnostics;
  - browser-side failure text;
  - whether `OPTIONS`/preflight occurs before `PUT`.

Live-confirmed on `test` through `/test/ops/info` harness:
- upload contract issuance;
- direct browser upload to Object Storage;
- finalize;
- attach job completion;
- attachment publication into snapshot/API;
- `view` redirect;
- `download` redirect;
- delete job completion;
- attachment disappearance from snapshot/API.

Known caveats carried forward from live test:
- reserved probe-task attachments from earlier failed runs may still exist on backend side and are cleaned separately by cleanup policy;
- `prod` still requires its own live smoke before claiming the same confidence level as `test`.

## Cache / persistence

SWR-like поведение, snapshot cache и runtime defaults живут в browser storage и описаны отдельно в `docs/deep/RUNTIME_CONFIG.md` и `docs/deep/RUNTIME_STORAGE.md`.

