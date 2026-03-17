# NOW - tasks

## Active
- [x] CAM-TELEGRAM-MINIAPP-V1 - auth linkage, `/app` shell, client-side mine/all selectors, mobile task/agenda/profile UX, docs refresh.
- [x] CAM-TELEGRAM-MINIAPP-V1 follow-up - Telegram linkage recovery fixed: auth auto-heal via `telegramId -> yandexEmail`, explicit Mini App unlinked state, docs refreshed.
- [x] CAM-ATTACHMENTS-UPLOAD-PREVIEW-V1 follow-up - frontend aligned with backend handoff: auth facade control-plane, direct presigned `PUT`, `jobs/{job_id}` polling, contour-safe `view/download`, drawer-wide drag-and-drop upload, docs refreshed.
- [x] CAM-ADMIN-TABS-TEMP-ACCESS-LINKS-V1 - admin IA rewritten into `Доступ / Стиль`, `Люди / Ссылки / Пресеты` tabs; temp-link runtime shipped end-to-end with YDB storage, redemption, `/me` session metadata, admin CRUD/revoke/stats UI, and auth-panel countdown.
- [x] CAM-ADMIN-STYLE-UI-INVENTORY-REAL-ELEMENTS-V2 - `Стиль -> UI` rebuilt from synthetic demo registry into a real project-wide UI inventory with fixed Cyrillic, surface-aware search/filter, similarity-ordered row cards, live previews, and canonical docs refresh.
- [x] CAM-MOBILE-WEB-FROM-MINIAPP-V1 - mobile web route `/m` now reuses the Telegram Mini App shell with Yandex auth, no Telegram-only bootstrap requirement, shared task/profile/timeline UX, and gateway/docs updates.
- [x] CAM-PROMO-LANDING-V1 - public `/promo` landing shipped with separate runtime content file, manual-play hero video, short/full marketing blocks, dedicated promo shell, screenshot-led product scenes from viewer-safe captures, and docs updates.
- [x] CAM-PROMO-REFERENCE-PACK-V1 - stable promo reference pack committed in-repo with master ref, 5 scene slices, reading guide, comparison checklist, and mandatory review loop for future `/promo` iterations.
- [x] CAM-PROMO-REFERENCE-ALIGNMENT-V2 - `/promo` rebuilt into a screenshot-led editorial narrative: single-focus hero, secondary video strip, editorial/showcase/summary/cta section types, baseline-vs-after screenshots, and review note against the promo reference pack.
- [ ] CAM-ATTACHMENTS-PDF-PREVIEW-STANDARDIZATION - force PDF.js preview even with missing metadata, align modal copy, and avoid browser viewer fallbacks.
- [ ] CAM-TELEGRAM-MINIAPP-NO-YANDEX-AUTH - allow Telegram Mini App access for people directory telegram IDs without Yandex login.
- [ ] CAM-USER-ALL-TASKS-FLAG - admin-controlled all-tasks access + hide designer grouping for non-privileged users.
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
