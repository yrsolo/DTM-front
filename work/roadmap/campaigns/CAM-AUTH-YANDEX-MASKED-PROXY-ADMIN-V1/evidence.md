# Evidence

## Infra
- `config/deploy.yaml` updated with two explicit YDB database paths
- YDB databases created:
  - `dtm-auth-test`
  - `dtm-auth-prod`
- auth YDB migrations applied to both contours
- lockbox updated with auth runtime secrets and contour-specific masking salts
- `auth-test` function deployed with:
  - `AUTH_BASE_PATH=/test/auth`
  - `API_PROXY_BASE_PATH=/test/api`
  - `API_UPSTREAM_ORIGIN=https://dtm-api-test.solofarm.ru`
  - `YDB_DATABASE=<test contour>`
- unified gateway updated so:
  - `/test/auth/*` -> `auth-test`
  - `/test/api/*` -> `auth-test`
  - `/test-front/admin` -> SPA entrypoint
- bootstrap utility added:
  - `scripts/auth_admin_tool.mjs`
  - verified against test contour with `list-users`

## Live test contour checks
- `https://dtm.solofarm.ru/test-front/` -> `200`
- `https://dtm.solofarm.ru/test-front/admin` -> `200`
- `https://dtm.solofarm.ru/test/auth/health` -> `200`
- `https://dtm.solofarm.ru/test/auth/me` -> anonymous auth payload
- `https://dtm.solofarm.ru/test/api/health` -> `200`
- `https://dtm.solofarm.ru/test/api/api/v2/frontend?...` -> masked snapshot payload
- localhost design mode works against the public test contour:
  - `Origin: http://localhost:5173` on `/test/auth/me` -> exact allow-origin + credentials
  - `Origin: http://localhost:5173` on `/test/api/api/v2/frontend?...` -> exact allow-origin + credentials
  - `OPTIONS /test/api/api/v2/frontend` from localhost -> `204` with credentialed CORS

## Pending
- prod function deploy
- `ADMIN_BOOTSTRAP_UID_*`
- richer admin UI polish and end-to-end auth flow validation through public domain
