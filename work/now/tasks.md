# NOW - tasks

## Active
- [ ] CAM-API-V2-LOADING-SWR-CACHE - finalize manual evidence pack.
- [x] CAM-SCHEMA-CONTRACT-GOVERNANCE - schema/types sync + validate:schema + guarantees.
- [ ] CAM-DOCS-CANONICAL-REWRITE - rebuild root README and docs tree around current frontend state.

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

See: `docs/operations/TROUBLESHOOTING.md`

## Session 2026-03-07
- [x] Milestone tone aliases: added resilient RU/EN mapping for card/calendar milestone colors using active API milestone names (work/pre_done/wait only).
- [x] Timeline: added page switch (`Задачи` / `Дизайнеры`) and designer columns board view with task cards + milestone/manager hover tooltip.
