# Campaign plan

Campaign ID: `CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Phases
### P01 — Inspect & Standardize Assumptions
- T001 Проверить текущий runtime loading конфига и целевой путь `/config/public.yaml`.
- T002 Проверить fallback path `/data/snapshot.example.json`.
- T003 Проверить build output `apps/web/dist`.
- T004 Внести минимальные правки фронта, если путь конфига/фолбэка отличается от целевого.

### P02 — Create Deploy Artifacts
- T001 Создать `docs/DEPLOY.md`:
  - prerequisites (Node.js, npm, AWS CLI)
  - setup vars (PowerShell-first)
  - build + deploy команды
  - website endpoint в Yandex Cloud
  - cache rules
  - troubleshooting (403/CORS/wrong endpoint/index issues)
- T002 Создать `scripts/deploy_env.example` без секретов.
- T003 Создать `scripts/deploy_frontend.ps1`:
  - validate env vars
  - check `aws --version`
  - install deps + build in `apps/web`
  - upload `apps/web/config/public.yaml` -> `s3://<bucket>/config/public.yaml` (`no-cache`)
  - upload `data/snapshot.example.json` -> `s3://<bucket>/data/snapshot.example.json` (`no-cache`, optional)
  - sync `apps/web/dist` -> `s3://<bucket>/` (`immutable` for hashed assets)
  - override `index.html` cache to `no-cache`
  - print next steps / endpoint hint
- T004 Optional: `scripts/deploy_frontend.sh`.
- T005 Обновить `README.md` ссылкой на `docs/DEPLOY.md`.

### P03 — Validate & Accept
- T001 Локально выполнить deploy одной командой.
- T002 Проверить website endpoint и ключевые URL:
  - `/config/public.yaml`
  - `/data/snapshot.example.json`
- T003 Проверить UI:
  - рендер обеих страниц
  - загрузка API URL из runtime config
  - fallback при недоступной API
- T004 Проверить caching behavior:
  - `index.html` no-cache
  - hashed assets immutable
- T005 Зафиксировать результаты в `evidence.md`.

## Notes
- Owner предоставляет: `YC_BUCKET_NAME`, `YC_ENDPOINT`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION=ru-central1` (и при необходимости `YC_FOLDER_ID`).
- Секреты в git не коммитим, только `.example`.
- Следующая кампания: CI deploy, CDN/custom domain, versioned releases.
