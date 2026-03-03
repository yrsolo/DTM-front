# Tasks (Now)

Campaign: `CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## P01 Discovery & Alignment
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T001 Проверить текущие runtime пути (`/config/public.yaml`, `/data/snapshot.example.json`, build output `apps/web/dist`).
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P01-T002 Согласовать итоговый список env для деплой-скриптов (без секретов в git).

## P02 Deploy Artifacts
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T001 Создать `docs/DEPLOY.md` (PowerShell-first, optional bash).
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T002 Создать `scripts/deploy_env.example`.
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T003 Реализовать `scripts/deploy_frontend.ps1`.
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T004 (Optional) Реализовать `scripts/deploy_frontend.sh`.
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P02-T005 Обновить `README.md` ссылкой на `docs/DEPLOY.md`.

## P03 Validation & Handover
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T001 Прогнать dry-run деплоя без публикации секретов в логи.
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T002 Проверить cache policy (`index.html=no-cache`, assets=immutable).
- [ ] CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE-P03-T003 Сформировать evidence/результаты и финальный checklist DoD.

Blocked:
- (none)

Done:
- (none)
