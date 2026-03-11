# Evidence

## Infra
- `config/deploy.yaml` updated with two explicit YDB database paths
- YDB databases created:
  - `dtm-auth-test`
  - `dtm-auth-prod`
- auth YDB migrations applied to both contours
- lockbox updated with auth runtime secrets and contour-specific masking salts
- `auth-test` function deployed with:
  - `AUTH_BASE_PATH=/test/ops/auth`
  - `API_PROXY_BASE_PATH=/test/ops/api`
  - `API_UPSTREAM_ORIGIN=https://dtm-api-test.solofarm.ru`
  - `YDB_DATABASE=<test contour>`
- unified gateway updated so:
  - `/test/ops/auth/*` -> `auth-test`
  - `/test/ops/*` -> test backend function
  - `/test` and `/test/` -> test frontend index
- bootstrap utility added:
  - `scripts/auth_admin_tool.mjs`
  - verified against test contour with `list-users`
- combined contour deploy scripts added:
  - `scripts/deploy_stack.ps1`
  - `scripts/deploy_stack.sh`
  - `scripts/deploy_test.cmd`
  - `scripts/deploy_prod.cmd`
- target-specific frontend build base added:
  - prod -> `/`
  - test -> `/test/`
- generic OAuth fallback removed:
  - only `YANDEX_CLIENT_ID_TEST/PROD` and `YANDEX_CLIENT_SECRET_TEST/PROD`

## Live test contour checks
- `https://dtm.solofarm.ru/test/` -> test frontend contour
- `https://dtm.solofarm.ru/test/admin` -> test admin SPA route
- `https://dtm.solofarm.ru/test/ops/auth/health` -> `200`
- `https://dtm.solofarm.ru/test/ops/auth/me` -> anonymous auth payload
- `https://dtm.solofarm.ru/test/ops/api/v2/frontend?...` -> masked snapshot payload
- localhost design mode works against the public test contour:
  - localhost runtime resolves to test contour for auth/api
  - login URL points to `/test/ops/auth/login`
  - callback URL is `/test/ops/auth/callback`

## Pending
- prod function deploy
- `ADMIN_BOOTSTRAP_UID_*`
- richer admin UI polish and end-to-end auth flow validation through public domain
- live validation after final gateway apply for `/test` and `/test/`
