# CAM-AUTH-YANDEX-MASKED-PROXY-ADMIN-V1

## Goal
Add Yandex-based auth/admin as a same-origin proxy layer in this repo while keeping anonymous frontend access in masked-data mode.

## Scope
- `apps/auth` Node/TS Cloud Function
- YDB-backed users/allowlist/access-request/audit storage
- test/prod contour split with separate YDB databases
- same-origin auth/api proxy paths for test and prod
- React admin SPA route in `apps/web`
- masked/full access model and backend handoff docs

## Non-goals
- hard blocking anonymous frontend rendering
- backend-side native auth in `dtm-api` during V1
- final bootstrap admin automation before `ADMIN_BOOTSTRAP_UID` is available

## Fixed decisions
- two separate YDB serverless databases: test and prod
- frontend test path: `/test-front/`
- test auth/api proxy paths: `/test/auth/*`, `/test/api/*`
- prod auth/api proxy paths: `/prod/auth/*`, `/prod/api/*`
- anonymous and pending users receive masked payloads
- approved users receive full payloads
