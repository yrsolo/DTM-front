# Architecture

## High-level (MVP)

[Browser]
   |
   | (static assets)
   v
[Static Hosting] (Object Storage / local dev)
   |
   | (fetch snapshot JSON)
   v
[Snapshot JSON] (local file OR API)

MVP focuses on UI correctness and data normalization.

---

## High-level (Production)

[Browser]
   |
   | 1) static UI
   v
[Object Storage Static Hosting] ---- optional ---> [CDN]
   |
   | 2) API calls (JWT / magic token)
   v
[API Gateway] ---auth---> [Serverless Containers / Functions]
   |                          v
   v                        [DB]
[Object Storage]
(snapshots + pre-signed URLs)

- Static UI is public; **data access is protected** via API.
- If snapshots are large files, backend returns **pre-signed URLs** for short-lived access.

---

## Web App internals (MVP)

### Layers

1) Data loading (`apps/web/src/data`)
   - `useSnapshot.ts`: SWR-style loader (memory + localStorage cache + background refresh).
   - `api.ts`: fetch wrapper with timeout/retry and optional ETag/304 handling.
   - `normalize.ts`: adapts API payload to `SnapshotV1`.

2) Domain + layout (`apps/web/src/gantt`)
   - `types.ts`: internal types for rendering.
   - `layout.ts`: compute x positions, widths, row heights, visible date range.
   - `TimeScale.ts`: time-to-pixel conversion.

3) UI (`apps/web/src/pages`, `apps/web/src/components`)
   - TopBar, FiltersBar
   - DesignersPage, TasksPage
   - TaskDetailsDrawer

### Key design decisions
- Use SVG for timelines in MVP for pixel control and simplicity.
- Keep the “normalization boundary” stable: UI expects `SnapshotV1`.
- Avoid complex state management libraries in MVP; React state + hooks only.
- Keep UI responsive for slow API by stale-while-revalidate:
  - show last valid snapshot immediately
  - refresh in background
  - keep stale data on refresh errors

---

## Versioning strategy (Prod)
- API returns `meta.version = "v1"` etc.
- UI supports latest version; can keep adapters for older versions if needed.

---

## Security (Prod)
- Auth: Yandex ID OAuth -> backend issues short-lived JWT for API.
- Magic links: backend generates token (store hashed), TTL, one-time.
- API gateway can validate JWT; magic link validation remains backend logic.
