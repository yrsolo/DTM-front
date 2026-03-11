# Auth Troubleshooting

## Test contour quick checks

Public test URLs:
- `https://dtm.solofarm.ru/test-front/`
- `https://dtm.solofarm.ru/test-front/admin`
- `https://dtm.solofarm.ru/test/auth/health`
- `https://dtm.solofarm.ru/test/auth/me`
- `https://dtm.solofarm.ru/test/api/health`
- `https://dtm.solofarm.ru/test/api/api/v2/frontend?...`

Expected baseline:
- `/test-front/` -> `200`
- `/test-front/admin` -> `200`
- `/test/auth/health` -> `{"ok":true,"contour":"test","kind":"auth"}`
- `/test/auth/me` without cookie -> anonymous masked state
- `/test/api/health` -> `{"ok":true,"contour":"test","kind":"api"}`
- `/test/api/api/v2/frontend` without cookie -> valid masked snapshot payload

## Frontend opens, but auth status stays guest

Check:
- `https://dtm.solofarm.ru/test/auth/health` returns `200`
- `https://dtm.solofarm.ru/test/auth/me` returns JSON, not HTML and not `404`
- browser is opening deployed frontend, not local dev server
- gateway still routes `/test/auth/*` to `auth-test`

## Admin page says administrator access is required

Check:
- user is actually logged in through Yandex
- user role in test YDB is `admin`
- cookie is still valid
- `session_version` was not invalidated

If `ADMIN_BOOTSTRAP_UID_TEST` is still not set, raise the first admin manually:

```bash
node scripts/auth_admin_tool.mjs --target test --command make-admin --user-id <USER_ID>
```

## API still returns masked payload after approve

Check:
- approve happened in the correct contour
- `users.status` is really `approved`
- browser cookie was refreshed after approve
- request goes to `/test/api/...`, not directly to upstream API

If needed, force a fresh session:
- logout
- login again

## Deploy function fails on secrets

Check lockbox entries:
- `YANDEX_CLIENT_ID`
- `YANDEX_CLIENT_SECRET`
- `SESSION_SIGNING_SECRET`
- `COOKIE_NAME`
- `COOKIE_PATH`
- `COOKIE_SAMESITE`
- `COOKIE_SECURE`
- `SESSION_TTL_SECONDS`
- `MASKING_SALT_TEST`
- `MASKING_SALT_PROD`

## Function does not see YDB

Check:
- `YDB_ENDPOINT`
- `YDB_DATABASE`
- function service account
- migrations were applied to the same contour that function uses

## Migrations passed, but admin data is empty

This is normal for a new auth DB.

V1 schema starts empty:
- allowlist must be filled explicitly
- first admin can be raised manually
- pending users only appear after first successful Yandex login

## Gateway routes drifted

Regenerate and apply the current unified gateway spec:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1
```

Dry-run:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/update_unified_gateway.ps1 -DryRun
```
