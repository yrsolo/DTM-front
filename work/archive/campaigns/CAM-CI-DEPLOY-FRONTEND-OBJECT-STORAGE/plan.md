# Campaign plan

Campaign ID: `CAM-CI-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Phases
### P01 Discovery & Contract
- T001 Define workflow triggers (`workflow_dispatch`, push to `dev`).
- T002 Define required GitHub `secrets` and `variables`.

### P02 Implementation
- T001 Create `.github/workflows/deploy_frontend.yml`.
- T002 Add CI setup section to `docs/DEPLOY.md`.
- T003 Keep local deploy scripts as fallback path.

### P03 Validation & Handover
- T001 Validate workflow YAML + build command path.
- T002 Record evidence and final checklist.

## Secrets and variables (target)
- GitHub Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- GitHub Variables:
  - `YC_BUCKET_NAME`
  - `YC_ENDPOINT` (default `https://storage.yandexcloud.net`)
  - `AWS_DEFAULT_REGION` (default `ru-central1`)
  - `DTM_WEB_PUBLIC_CONFIG_PATH` (default `apps/web/config/public.yaml`)
