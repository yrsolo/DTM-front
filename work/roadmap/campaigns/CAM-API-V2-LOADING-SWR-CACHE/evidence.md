# Evidence: CAM-API-V2-LOADING-SWR-CACHE

- [ ] Video: второй запуск показывает данные мгновенно + “Updating…”
- [ ] Screenshot: stale banner when API offline
- [ ] DevTools: localStorage keys present
- [ ] Logs: timeout/retry occurs (dev only)

Progress:
- SWR states implemented in `useSnapshot` (`cold_loading`, `ready`, `refreshing`, `stale_error`).
- Persistent normalized cache implemented:
  - `dtm.snapshot.v1`
  - `dtm.snapshot.meta`
- API timeout/retry implemented via AbortController and configurable retry delay.
- Conditional request support added:
  - `If-None-Match` request header
  - `304 Not Modified` handled without resetting UI snapshot
- Optional background refresh interval added via runtime config:
  - `api_refresh_interval_ms` in `public.yaml`
- Default refresh interval set to 60s (`api_refresh_interval_ms: 60000`).
- UI refresh interval selector added in filters bar:
  - Off / 15s / 30s / 1m / 5m
- Fixed refresh loop risk in hook dependencies (stable refresh callbacks).
- UI build passes with new loading/refresh states.
- `npm run validate:schema` passes after schema-governance changes.
- Manual evidence collection checklist added:
  - `docs/system/SWR_SMOKE_CHECKLIST.md`
