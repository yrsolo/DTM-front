# NOW - tasks

## Active
- [x] CAM-TELEGRAM-MINIAPP-V1 - auth linkage, `/app` shell, client-side mine/all selectors, mobile task/agenda/profile UX, docs refresh.
- [x] CAM-TELEGRAM-MINIAPP-V1 follow-up - Telegram linkage recovery fixed: auth auto-heal via `telegramId -> yandexEmail`, explicit Mini App unlinked state, docs refreshed.
- [x] CAM-ATTACHMENTS-UPLOAD-PREVIEW-V1 follow-up - frontend aligned with backend handoff: auth facade control-plane, direct presigned `PUT`, `jobs/{job_id}` polling, contour-safe `view/download`, drawer-wide drag-and-drop upload, docs refreshed.
- [x] CAM-ADMIN-TABS-TEMP-ACCESS-LINKS-V1 wave 1 - admin IA rewritten into `Доступ / Стиль`, `Люди / Ссылки / Пресеты` tabs, temp-link operator stub added, `/me` reserved fields documented, overview shape extended with `accessLinks`.
- [ ] CAM-API-V2-LOADING-SWR-CACHE - finalize manual evidence pack.
- [x] CAM-SCHEMA-CONTRACT-GOVERNANCE - schema/types sync + validate:schema + guarantees.
- [ ] CAM-DOCS-CANONICAL-REWRITE - rebuild root README and docs tree around current frontend state.
- [ ] CAM-AUTH-YANDEX-MASKED-PROXY-ADMIN-V1 - auth function, masked access mode, admin SPA, YDB test/prod contours. Routing contract updated to `prod=/`, `test=/test`, service namespace moved to `/ops/*`, frontend buckets split to `dtm-front` and `dtm-front-test`; test contour remains the active rollout target.

## SWR status
- [x] SWR runtime implemented (cache + background refresh + stale_error).
- [x] Timeout/retry implemented.
- [x] Conditional 304 path implemented.
- [x] Build is green.
- [ ] Collect manual evidence (video/screenshot/devtools/logs).

## Blocked
- Manual evidence capture requires browser actions:
  - video for instant second launch + Updating...
  - screenshot of stale banner when API is offline
  - screenshot of localStorage keys
  - screenshot/log snippet for timeout/retry

See: `docs/deep/TROUBLESHOOTING.md`

## Session 2026-03-07
- [x] Milestone tone aliases: added resilient RU/EN mapping for card/calendar milestone colors using active API milestone names (work/pre_done/wait only).
- [x] Timeline: added page switch (`Задачи` / `Дизайнеры`) and designer columns board view with task cards + milestone/manager hover tooltip.

## Session 2026-03-11
- [x] GitHub deploy workflows rebuilt: frontend upload moved to S3-compatible `aws s3`, auth workflow no longer installs `yc` CLI and deploys via `yc-actions/yc-sls-function`.

## Session 2026-03-12
- [x] Auth/admin UX completion: auth-panel now explains login/access/admin state, masking control moved into the panel, admin page access states and RU copy cleaned up.
- [x] Auth session fix: auth function now reads cookies from YC gateway event shapes and returns multi-value `Set-Cookie`; test account `yrsolo@yandex.ru` promoted to `approved/admin` in test YDB.
- [x] Admin panel expanded: pending and approved user lists, soft reject flow, admin role controls, request timestamps, avatars, and self-lockout protection. Test frontend/auth contour redeployed.
- [x] Backend auth handoff clarified: browser masking toggle now maps to `with auth` vs `without auth` API requests; auth proxy forwards trusted `x-dtm-*` access headers upstream; Yandex avatar URL is stored from profile metadata.
- [x] Workbench re-architecture: canonical tabs replaced historical taxonomy, duplicate/orphan controls removed from layout, workbench tab persistence added, and audit report + taxonomy docs prepared.
