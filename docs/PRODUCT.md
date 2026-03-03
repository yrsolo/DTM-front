# Product Spec: DTM Web Frontend

## Problem
Current DTM outputs heavy Google Sheets-based Gantt diagrams.
They are slow to render, hard to style pixel-perfect, and not ideal for interactive navigation (filters, search, drill-down).

## Solution
A dedicated web UI:
- renders Gantt-like timelines and operational tables,
- consumes DTM data snapshots from API (or static JSON for MVP),
- provides fast filtering/search,
- becomes the long-term replacement for “drawing in Sheets”.

---

## Users
- Designers: daily view of tasks and deadlines.
- Team lead / manager: overview by people and by tasks.
- Admin (prod): controls access and shares links.

---

## MVP (No Auth)

### Goals
- Deliver usable UI quickly.
- Validate timeline rendering and interaction.
- Avoid security/auth work until the UI is proven.

### Features (MVP)

1) View: **By Designers**
   - List designers.
   - Timeline rows with task bars.
   - Tooltip on hover.
   - Click opens details drawer.

2) View: **By Tasks**
   - Table view with columns:
     - Title
     - Designer
     - Status
     - Start / End
   - Timeline aligned with table rows.
   - Filters: designer, status; text search.

3) Data
   - Load from `data/snapshot.example.json`.
   - Optional: if `VITE_API_BASE_URL` configured, load from `${base}/snapshot`.

### Non-goals (MVP)
- Authentication/authorization.
- Admin panel.
- Editing tasks.
- Perfect performance optimizations for 10k+ tasks (not needed).

### Success criteria (MVP)
- The app loads and renders both pages within a few seconds on typical laptop.
- Filters/search work and UI remains responsive for ~1000 tasks dataset.
- Visual layout is stable and readable.

---

## Production Version

### Features (Prod)

1) Auth & Access
   - Yandex ID OAuth login.
   - Short-lived session tokens (JWT).
   - Optional magic links:
     - TTL (e.g., 15 min)
     - one-time use
     - optionally requires login (link+user binding).

2) Admin panel
   - Allowlist management (Yandex uid/email).
   - Generate/revoke magic links.
   - Audit log.

3) Data contract
   - Versioned API responses.
   - Optional incremental updates:
     - `GET /changes?since=...` OR ETag/If-None-Match caching.
   - Better time zone handling and year inference moved fully into API.

4) UX improvements
   - Saved filter presets.
   - Deep links to task IDs.
   - Export (PNG/PDF/CSV).
   - Multi-project grouping.

5) Observability
   - Structured logs.
   - Metrics (latency, errors).
   - Alerts.

### Non-goals (Prod)
- Full task editing (unless later required).
- Replacing the source of truth (Google Sheets remains the input system).

---

## Open questions (to resolve while building API)
- Final status taxonomy and mapping.
- Task grouping model (projects/streams).
- Dependencies model usage.
- Update frequency and caching strategy.
