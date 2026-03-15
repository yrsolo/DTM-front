# Backend Auth Handoff

Назначение:
- зафиксировать browser-facing auth/data contract между frontend, auth proxy и backend;
- описать trusted headers, которые backend получает от auth contour;
- исключить двусмысленность между browser traffic, backend-owned `/ops/api/*` и browser-facing `/ops/bff/*`.

Source of truth:
- `apps/auth/src/handlers/apiProxy.ts`
- `apps/auth/src/handlers/authHandlers.ts`
- `apps/web/src/data/api.ts`
- `apps/web/src/config/runtimeContour.ts`

Если нужен только общий контекст, сначала прочитайте [AUTH_AND_ACCESS.md](../glance/AUTH_AND_ACCESS.md).

## Public browser contract

### Test
- frontend: `https://dtm.solofarm.ru/test/`
- browser-facing data path: `/test/ops/bff/v2/frontend`
- auth/session/admin/presets: `/test/ops/auth/*`

### Prod
- frontend: `https://dtm.solofarm.ru/`
- browser-facing data path: `/ops/bff/v2/frontend`
- auth/session/admin/presets: `/ops/auth/*`

## Namespace ownership

Browser never calls backend-owned service routes directly.

Backend-owned service namespace:
- `/ops/api/*`
- `/ops/admin/*`
- `/ops/telegram*`
- `/test/ops/api/*`
- `/test/ops/admin/*`
- `/test/ops/telegram*`

Browser-facing proxy namespace:
- `/ops/bff/*`
- `/test/ops/bff/*`

Auth/session namespace:
- `/ops/auth/*`
- `/test/ops/auth/*`

Task attachment routes use a dedicated auth facade instead of generic `bff`:
- browser control plane uses `/ops/auth/attachments/*` and `/test/ops/auth/attachments/*`;
- `request-upload`, `finalize`, `delete`, `jobs/{job_id}`, `view`, and `download` are all browser-safe auth routes;
- binary upload then goes directly from browser to the presigned Object Storage URL returned by `request-upload`;
- backend-owned `/ops/admin/*` and `/ops/api/task-attachments/*` stay internal service routes and must not be opened directly by the browser.

## Browser -> Auth proxy

Frontend always calls the auth proxy for browser data requests:
- prod -> `/ops/bff/*`
- test -> `/test/ops/bff/*`

Frontend behavior:
- full mode -> request with `credentials: "include"`
- masked mode -> request with `credentials: "omit"`
- browser must not set trusted `x-dtm-*` headers itself
- browser must not know or send `BROWSER_AUTH_PROXY_SECRET`

Masking toggle in the frontend changes only this:
- whether the browser sends auth cookie;
- not which route it calls.

## Auth proxy -> Backend

Auth proxy validates session, computes access mode and proxies the request to backend upstream.

Trusted upstream headers:
- `X-DTM-Proxy-Secret`
- `x-dtm-access-mode: full | masked`
- `x-dtm-authenticated: 1 | 0`
- `x-dtm-contour: test | prod`
- `x-dtm-user-id` only for approved `full` requests
- `x-dtm-user-role: admin | viewer` only for approved `full` requests
- `x-dtm-user-status: approved` only for approved `full` requests

Important:
- backend must treat these headers as trustworthy only when request arrived through the auth proxy/gateway chain and has a valid `X-DTM-Proxy-Secret`;
- backend must not trust browser-supplied `x-dtm-*` headers outside this chain.

## Full vs masked behavior

### Full

Backend may return full payload only when all of this is true:
- valid `X-DTM-Proxy-Secret`
- `x-dtm-authenticated: 1`
- `x-dtm-access-mode: full`

Expected scenario:
- approved user or admin;
- frontend sent browser request with cookie;
- auth proxy validated session and forwarded trusted full headers.

### Masked

Backend must return masked payload when any of this is true:
- missing or invalid `X-DTM-Proxy-Secret`
- `x-dtm-authenticated: 0`
- `x-dtm-access-mode: masked`

This covers:
- guest;
- expired or invalid session;
- approved or admin user who intentionally enabled masking in UI and sent the request without cookie;
- any direct browser call outside the proxy chain.

## Payload expectations

Masked mode should hide real business-sensitive values, at minimum:
- task title
- brand
- customer
- show or group name
- person or designer names
- other reconstructable free-text fields

Even in masked mode backend should keep stable structure:
- ids
- dates
- statuses
- milestone sequence
- summary and meta shape
- the same frontend `v2` payload form

## OAuth callbacks

- test callback: `https://dtm.solofarm.ru/test/ops/auth/callback`
- prod callback: `https://dtm.solofarm.ru/ops/auth/callback`

## Preset catalog through auth contour

Preset catalog APIs live under auth contour and are shared across test and prod through the shared preset bucket:
- `GET /ops/auth/presets?kind=color|layout`
- `GET /test/ops/auth/presets?kind=color|layout`
- `POST /ops/auth/presets`
- `PUT /ops/auth/presets/:id`
- `DELETE /ops/auth/presets/:id`
- `GET /ops/auth/presets/:id/export`
- `GET /test/ops/auth/presets/:id/export`

Preset assets are publicly readable JSON files served from:
- preferred origin: `https://dtm-presets.website.yandexcloud.net`
- storage fallback: `https://storage.yandexcloud.net/dtm-presets`

Graceful degradation:
- preset catalog or preset asset outage must not break auth flow, snapshot loading or API proxy behavior;
- application should stay operational in builtin-only preset mode.

