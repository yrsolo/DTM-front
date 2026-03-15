work/roadmap/campaigns/CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1/campaign.md

# CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1

## Status
Proposed

## Owner
Frontend

## Goal
Добавить во frontend DTM поддержку task attachments в полном соответствии с текущим backend contour:

- attachments отображаются в карточке задачи;
- одна задача может содержать несколько вложений;
- frontend использует только canonical snapshot payload и backend-provided links;
- пользователь в trusted/full/approved contour может открыть или скачать attachment;
- masked contour не показывает attachments вообще;
- desktop и Mini App используют один и тот же normalized task model.

## Why
Backend attachment subsystem уже реализован и публикует attachment metadata в `tasks[].attachments`.
Read path уже оформлен через backend-owned `view` / `download` routes.
Фронту нужно просто корректно принять этот контракт и отрендерить его как product surface без собственного attachment backend logic.

## Scope
### In scope
- расширение shared snapshot schema;
- обновление normalize/data path;
- attachment section в `TaskDetailsDrawer`;
- open/download actions через payload links;
- graceful handling for missing links / denied / expired / broken routes;
- desktop + Mini App compatible UX;
- tests and UI evidence.

### Out of scope
- upload attachments;
- delete attachments;
- admin attachment management;
- custom DOCX renderer;
- OCR;
- summary/extraction UI;
- PDF support;
- image thumbnail pipeline.

## Backend contract summary
### Canonical task payload
Backend exposes attachment metadata through:
- `tasks[].attachments`

Frontend-safe fields:
- `id`
- `name`
- `mime`
- `kind`
- `sizeBytes`
- `status`
- `uploadedAt`
- `capabilities`
- `meta.preview` when present
- `links.view`
- `links.download`

Important:
- only `ready + snapshot_visible` attachments are published;
- masked contour hides attachments entirely;
- storage keys are never exposed in frontend payload.

### Backend-owned read routes
Backend owns read routes:
- `GET /ops/api/task-attachments/{attachment_id}/view`
- `GET /ops/api/task-attachments/{attachment_id}/download`
- same routes under `/test`

Frontend must not build these URLs manually from `attachment_id`.
Frontend must use `links.view` and `links.download` from payload as opaque links.

## Product rules
1. Attachments are read-only in this wave.
2. If a task has no `attachments`, frontend renders no attachment section.
3. If attachment has no `links.view`, `Open` must be hidden or disabled.
4. If attachment has no `links.download`, `Download` must be hidden or disabled.
5. Frontend must never derive storage or API URLs from attachment ids.
6. Frontend must never assume attachments exist in masked mode if payload does not include them.
7. Unknown/unsupported attachment kinds must degrade to a generic file row, not break the drawer.
8. Route failure must be local to the attachment action, not global to the task drawer.

## UX plan
### Desktop
Render a dedicated `Attachments` section inside `TaskDetailsDrawer`.

Each attachment row should show:
- icon by kind;
- filename;
- secondary metadata:
  - file type/kind
  - human-readable size
  - optional uploaded date
- actions:
  - `Open`
  - `Download`

### Mini App
Use the same task data model and the same attachment section semantics.
Buttons must be touch-friendly.
Do not rely on hover.
Open/download behavior may depend on container/browser rules, but the UI contract remains the same.

## Open/download behavior
### Open
Use `links.view` as-is.
Preferred behavior:
- open in a new browser context/tab/window when platform allows;
- if open fails, show a small local error state.

### Download
Use `links.download` as-is.
Do not synthesize a fallback URL.

### Error handling
If `view`/`download` returns denied/expired/broken behavior:
- keep task drawer open;
- show local inline/non-blocking error feedback;
- allow user to retry naturally.

## Architecture constraints
1. Shared schema is source of truth.
2. Normalization remains centralized.
3. Drawer stays presentational.
4. Frontend uses payload links only.
5. Frontend does not encode backend access policy beyond local UI states.
6. Frontend remains backward-compatible with snapshots that do not include `attachments`.

## Files to touch
### Schema
- `packages/schema/snapshot.ts`

### Data
- `apps/web/src/data/normalize.ts`
- optional attachment helpers/selectors if needed

### UI
- `apps/web/src/components/TaskDetailsDrawer.tsx`
- optional extraction into:
  - `apps/web/src/components/attachments/TaskAttachmentsSection.tsx`
  - `apps/web/src/components/attachments/AttachmentRow.tsx`

### Text/helpers
- `apps/web/src/i18n/uiText.ts`
- optional:
  - `apps/web/src/utils/formatBytes.ts`
  - `apps/web/src/utils/attachments.ts`

## Key design decisions
1. Frontend consumes attachments only from canonical task payload.
2. Frontend treats `links.view` / `links.download` as opaque.
3. Frontend does not use transitional admin endpoints.
4. Frontend does not implement custom attachment rendering engines in this wave.
5. Missing/denied/broken attachment actions do not collapse the drawer.

## Done when
1. Shared schema supports `attachments`.
2. Normalize path preserves attachment data.
3. Task details UI renders attachment rows when attachments exist.
4. Open/download actions use backend-provided links.
5. No-attachment tasks render unchanged.
6. Desktop and Mini App layouts remain stable.
7. Tests/evidence are recorded.

work/roadmap/campaigns/CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1/tasks.md

# CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1 Tasks

## P01 — Schema and contract alignment

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P01-T001
Расширить `packages/schema/snapshot.ts` типом attachment projection.

Acceptance:
- added `TaskAttachmentV1`
- `TaskV1` includes `attachments?: TaskAttachmentV1[]`
- fields match current backend payload exactly:
  - `id`
  - `name`
  - `mime`
  - `kind`
  - `sizeBytes`
  - `status`
  - `uploadedAt`
  - `capabilities`
  - `meta.preview`
  - `links.view`
  - `links.download`

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P01-T002
Сохранить backward compatibility with payloads without attachments.

Acceptance:
- old snapshots still parse
- no runtime crash when `attachments` is absent

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P01-T003
Зафиксировать in-code comments that links are opaque backend-owned links.

Acceptance:
- schema comments/documentation explicitly forbid frontend URL synthesis from `attachment_id`

## P02 — Data normalization

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P02-T001
Обновить `apps/web/src/data/normalize.ts`.

Acceptance:
- attachments survive backend payload normalization
- `sizeBytes` is preserved as-is
- links remain opaque strings

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P02-T002
Добавить defensive guards for malformed attachment payload.

Acceptance:
- malformed arrays/fields do not crash normalization
- invalid records are ignored or softened safely

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P02-T003
При необходимости вынести attachment formatting helpers.

Acceptance:
- presentation components stay simple
- repeated logic is centralized

## P03 — Task details UI

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P03-T001
Добавить `Attachments` section to `TaskDetailsDrawer.tsx`.

Acceptance:
- section renders only when `attachments.length > 0`
- section does not appear for masked/no-attachment payloads
- current drawer layout remains stable

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P03-T002
Реализовать attachment row UI.

Acceptance:
- shows kind icon
- shows filename
- shows human-readable `sizeBytes`
- optionally shows `uploadedAt`
- shows actions based on presence of links

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P03-T003
Handle generic/unknown states safely.

Acceptance:
- unknown kind falls back to generic file icon/label
- missing links hide or disable corresponding actions
- no broken empty placeholders

## P04 — Open and download actions

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P04-T001
Implement `Open` via `links.view`.

Acceptance:
- uses payload link as-is
- does not construct URL from `attachment_id`
- failure remains local to row/section

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P04-T002
Implement `Download` via `links.download`.

Acceptance:
- uses payload link as-is
- no synthetic fallback route
- hidden or disabled when link absent

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P04-T003
Add local non-blocking action error handling.

Acceptance:
- open/download failure shows small local error
- task drawer stays usable
- user can retry

## P05 — Text and formatting

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P05-T001
Add UI text keys.

Acceptance:
- labels exist for:
  - attachments section title
  - open
  - download
  - unavailable
  - action failed
  - generic file

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P05-T002
Add file-size formatter for `sizeBytes`.

Acceptance:
- consistent formatting for B / KB / MB / GB
- no duplication in components

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P05-T003
Improve long filename handling.

Acceptance:
- no layout break on long names
- filename remains reasonably identifiable

## P06 — Desktop and Mini App checks

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P06-T001
Verify desktop drawer behavior.

Acceptance:
- attachment section fits current layout
- actions are clickable
- no overflow regressions

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P06-T002
Verify `/app` Mini App behavior.

Acceptance:
- actions are touch-friendly
- no hover dependency
- narrow screens remain readable

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P06-T003
Verify platform-friendly open/download behavior.

Acceptance:
- desktop behavior feels natural
- Mini App still behaves acceptably under container/browser restrictions
- no hardcoded platform-specific URL logic

## P07 — Tests and evidence

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P07-T001
Add normalize/schema tests.

Acceptance:
- payload with attachments parses
- payload without attachments parses
- malformed attachment payload does not crash

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P07-T002
Add UI tests or screenshot evidence.

Coverage:
- no attachments
- one docx
- multiple mixed attachments
- missing view link
- missing download link
- long filename

### CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1-P07-T003
Prepare closeout notes.

Acceptance:
- final backend contract captured
- known browser/Mini App caveats captured
- limitations recorded

work/roadmap/campaigns/CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1/notes.md

# CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1 Notes

## Backend-aligned contract
Current backend exposes attachment metadata through:
- `tasks[].attachments`

Current frontend-safe fields:
- `id`
- `name`
- `mime`
- `kind`
- `sizeBytes`
- `status`
- `uploadedAt`
- `capabilities`
- `meta.preview` when present
- `links.view`
- `links.download`

Important publication rules:
- only `ready + snapshot_visible=true` attachments are published
- masked contour hides attachments entirely
- deleted / pending / uploaded_unverified / failed attachments are not frontend-visible

## Canonical read routes
Backend owns read routes:
- `GET /ops/api/task-attachments/{attachment_id}/view`
- `GET /ops/api/task-attachments/{attachment_id}/download`
- same routes under `/test`

Frontend rule:
- use payload links only
- do not construct route from `attachment_id`
- do not infer storage URL
- do not use admin endpoints for read behavior

## Recommended schema shape
```ts
export type TaskAttachmentLinksV1 = {
  view?: string | null;
  download?: string | null;
};

export type TaskAttachmentMetaV1 = {
  preview?: string | null;
};

export type TaskAttachmentV1 = {
  id: string;
  name: string;
  mime: string;
  kind: "docx" | "image";
  sizeBytes: number;
  status: string;
  uploadedAt?: string | null;
  capabilities?: string[];
  meta?: TaskAttachmentMetaV1;
  links?: TaskAttachmentLinksV1;
};

TaskV1 extension

attachments?: TaskAttachmentV1[];

Source-of-truth map

schema: packages/schema/snapshot.ts

normalize: apps/web/src/data/normalize.ts

task details UI: apps/web/src/components/TaskDetailsDrawer.tsx


UI recommendation

Section placement

Render Attachments inside TaskDetailsDrawer. Show section only when payload contains at least one attachment.

Row content

Each row should show:

icon by kind

filename

secondary info:

kind/type

formatted size

optional date


actions:

Open

Download



Graceful degradation rules

No attachments

Render nothing.

Missing links.view

Hide or disable Open.

Missing links.download

Hide or disable Download.

Broken/expired/denied action

Show small local error text. Do not collapse or reset the full drawer.

Unknown/malformed item

Prefer safe generic fallback or ignore invalid record. Do not crash UI.

Formatting notes

File size

Use sizeBytes from payload. Add helper for:

B

KB

MB

GB


Uploaded date

Show only if useful and easy within existing formatting conventions.

Long filenames

Must not break row layout. Use truncation or wrapping as appropriate.

Platform notes

Desktop

Opening links.view in a new tab/window is acceptable.

Mini App

Container/browser behavior may vary. Frontend should still:

attempt normal open behavior through the provided link;

keep Download available when link exists;

avoid popup-only assumptions.


Non-goals

upload UI

delete UI

custom docx renderer

summary UI

OCR/extraction UI

PDF viewer


Suggested implementation order

1. schema


2. normalize


3. helper formatting


4. drawer section


5. open/download actions


6. Mini App verification


7. tests/evidence



### `work/now/campaign.md`

```md
# Current Campaign

## Active campaign
- `CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1`

## Goal
Добавить frontend support для task attachments строго по текущему backend contract:
- `tasks[].attachments` in snapshot payload;
- `links.view` / `links.download` as opaque backend-owned links;
- drawer presentation;
- desktop + Mini App compatible behavior.

## Why now
Backend attachment subsystem is already live:
- attachment metadata is in task payload;
- masked contour hides attachments entirely;
- browser read uses backend routes.

Frontend now needs to expose this capability cleanly.

## Scope for current wave
In:
- schema
- normalize
- task details UI
- open/download actions
- local error handling
- desktop/Mini App checks
- tests/evidence

Out:
- upload
- delete
- admin management
- custom document rendering
- summary UI

## Success criteria
- attachments appear when present in payload;
- no section appears when attachments are absent;
- open/download use payload links only;
- no synthetic attachment URL logic exists in frontend;
- desktop and Mini App remain stable.

work/now/tasks.md

# Current Tasks

## Active campaign
`CAM-2026-03-15-FRONTEND-TASK-ATTACHMENTS-V1`

## Current priorities

### 1. Schema alignment
- [ ] Add `TaskAttachmentV1` to `packages/schema/snapshot.ts`
- [ ] Extend `TaskV1` with `attachments?: TaskAttachmentV1[]`
- [ ] Match backend field names exactly, including `sizeBytes`
- [ ] Document that links are opaque backend-owned links

### 2. Normalize path
- [ ] Update `apps/web/src/data/normalize.ts`
- [ ] Preserve `attachments`
- [ ] Preserve `sizeBytes`
- [ ] Keep malformed payload handling defensive
- [ ] Do not synthesize URLs

### 3. Drawer UI
- [ ] Add `Attachments` section to `TaskDetailsDrawer.tsx`
- [ ] Render attachment rows with icon/name/size/date/actions
- [ ] Hide section when no attachments
- [ ] Handle long filenames cleanly

### 4. Actions
- [ ] Implement `Open` via `links.view`
- [ ] Implement `Download` via `links.download`
- [ ] Hide or disable actions when link missing
- [ ] Add local non-blocking error state for failures

### 5. Text and helpers
- [ ] Add attachment UI labels
- [ ] Add `sizeBytes` formatter
- [ ] Add generic fallback visuals for unknown cases

### 6. Desktop and Mini App checks
- [ ] Verify desktop layout
- [ ] Verify `/app` narrow-screen layout
- [ ] Verify acceptable open/download behavior in Mini App context

### 7. Tests and evidence
- [ ] Add schema/normalize tests
- [ ] Add evidence for:
  - no attachments
  - one attachment
  - multiple attachments
  - missing links
  - long filename
- [ ] Record caveats in closeout

## Next checkpoint
Land schema + normalize first, then drawer UI, then open/download actions, then Mini App verification.

