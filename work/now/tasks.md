# Tasks (Now)

Campaign: `CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## P01 Discovery & Alignment
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T001 Проверить текущие runtime пути (`/config/public.yaml`, `/data/snapshot.example.json`, build output `apps/web/dist`).
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T002 Согласовать итоговый список env для деплой-скриптов (без секретов в git).

## P02 Deploy Artifacts
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T001 Создать `docs/DEPLOY.md` (PowerShell-first, optional bash).
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T002 Создать `scripts/deploy_env.example`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T003 Реализовать `scripts/deploy_frontend.ps1`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T004 (Optional) Реализовать `scripts/deploy_frontend.sh`.
- [x] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T005 Обновить `README.md` ссылкой на `docs/DEPLOY.md`.

## P03 Validation & Handover
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T001 Прогнать dry-run деплоя без публикации секретов в логи.
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T002 Проверить cache policy (`index.html=no-cache`, assets=immutable).
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T003 Сформировать evidence/результаты и финальный checklist DoD.

Blocked:
- (none)

Done:
- (none)

## Ad-hoc UI
- [x] CAM-ADHOC-GANTT-UI-REFRESH-T001 Refresh grant/gantt charts design in `apps/web` (Designers/Tasks pages, table visuals, timeline visuals, responsive polish).
- [x] CAM-ADHOC-LOCAL-FIRST-SNAPSHOT-T001 Default data load from local JSON, add actions to reload local JSON and update local JSON from API.
- [x] CAM-ADHOC-DESIGN-CONTROLS-T001 Add in-browser design controls panel for size/offset tuning with save/load/reset presets in local storage.
- [x] CAM-ADHOC-TIMELINE-FINETUNE-T001 Add date-label offset control, wheel zoom, dd-mm labels, themed scrollbar, remove KPI blocks, and simplify tasks table to title+status.
