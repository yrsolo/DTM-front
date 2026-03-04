# Tasks (Now)

Campaign: `CAM-VERSIONED-RELEASES-FRONTEND`

## Active Campaign (Current)
### P01 Discovery & Design
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P01-T001 Define release id format and storage layout in bucket.
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P01-T002 Confirm owner expectations for rollback flow.

### P02 Implementation
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P02-T001 Add release-id support to deploy scripts.
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P02-T002 Upload release metadata (`releases/<id>/release.json` + latest pointer).
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P02-T003 Update docs with versioned deploy + rollback notes.

### P03 Validation & Handover
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P03-T001 Validate dry-run with explicit release id.
- [x] CAM-VERSIONED-RELEASES-FRONTEND-P03-T002 Record evidence + final DoD checklist.

## Completed Campaign (Reference)
`CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## P01 Discovery & Alignment
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T001 Проверить текущие runtime пути (`/config/public.yaml`, `/data/snapshot.example.json`, build output `apps/web/dist`).
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T002 Согласовать итоговый список env для деплой-скриптов (без секретов в git).

## P02 Deploy Artifacts
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T001 Создать `docs/DEPLOY.md` (PowerShell-first, optional bash).
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T002 Создать `scripts/deploy_env.example`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T003 Реализовать `scripts/deploy_frontend.ps1`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T004 (Optional) Реализовать `scripts/deploy_frontend.sh`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T005 Обновить `README.md` ссылкой на `docs/DEPLOY.md`.

## P03 Validation & Handover
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T001 Прогнать dry-run деплоя без публикации секретов в логи.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T002 Проверить cache policy (`index.html=no-cache`, assets=immutable).
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T003 Сформировать evidence/результаты и финальный checklist DoD.

Blocked:
- (none)

Done:
- CAM-CDN-CUSTOM-DOMAIN-FRONTEND done by owner confirmation (`https://dtm.solofarm.ru` working).

## Ad-hoc UI
- [x] CAM-ADHOC-GANTT-UI-REFRESH-T001 Refresh grant/gantt charts design in `apps/web` (Designers/Tasks pages, table visuals, timeline visuals, responsive polish).
- [x] CAM-ADHOC-LOCAL-FIRST-SNAPSHOT-T001 Default data load from local JSON, add actions to reload local JSON and update local JSON from API.
- [x] CAM-ADHOC-DESIGN-CONTROLS-T001 Add in-browser design controls panel for size/offset tuning with save/load/reset presets in local storage.
- [x] CAM-ADHOC-TIMELINE-FINETUNE-T001 Add date-label offset control, wheel zoom, dd-mm labels, themed scrollbar, remove KPI blocks, and simplify tasks table to title+status.
- [x] CAM-ADHOC-DESIGN-PRESET-DEPLOY-T001 Add export/import for design presets and runtime loading from /config/design-controls.json for deploy persistence.
- [x] CAM-ADHOC-MATERIAL-CONTROLS-T001 Add separate left-side material controls panel for visual depth/color styling without changing layout dimensions.
- [x] CAM-ADHOC-COLOR-CONTROLS-T001 Add third center color controls panel for key theme colors, applied to CSS and timeline gradients.
- [x] CAM-ADHOC-GANTT-MILESTONES-T001 Render task milestones on gantt bars and include milestone dates in timeline range.
- [x] CAM-ADHOC-MILESTONE-STYLING-T001 Add controls for milestone size/color and per-task deterministic random color mix by task id.
