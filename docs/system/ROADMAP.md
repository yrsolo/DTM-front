# Roadmap to Production

## P1 — API contract stabilization
- Freeze `SnapshotV1` fields and semantics.
- Add `meta.etag` or `meta.hash`.
- Optional incremental endpoint:
  - `GET /changes?since=...`
- Define status taxonomy and mapping.
Deliverables:
- `docs/API_CONTRACT.md` finalized for v1.
- UI uses adapter for v1.

---

## P2 — Auth (Yandex ID) + protected data
- OAuth login via Yandex ID.
- Backend issues short-lived JWT.
- API Gateway validates JWT.
- UI stores token in memory (or httpOnly cookie in prod).
Deliverables:
- Protected `GET /snapshot`.
- Basic login page / redirect flow.

---

## P3 — Magic links (optional but desired)
- Admin generates magic link with TTL and optional one-time.
- Backend validates token and returns either:
  - snapshot directly
  - or a short-lived JWT
Deliverables:
- Shareable links for external viewers.

---

## P4 — Admin panel
- Allowlist management:
  - add/remove users
  - roles: admin/viewer
- Links management:
  - list active links
  - revoke link
- Audit log:
  - access events
Deliverables:
- `/admin` UI and DB tables.

---

## P5 — Performance + UX polish
- Virtualization for large lists.
- Better scale rendering and day/week/month zoom.
- Saved views presets.
- Export PNG/PDF/CSV.
- e2e tests (Playwright).
Deliverables:
- Stable “daily driver” UI.
