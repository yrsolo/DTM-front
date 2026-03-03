# DTM-front

```md
# DTM Web Frontend — Master Spec (MVP + Prod) + Repo Docs Pack (single-file)

> Purpose of this file: **single source of truth** for the repository.  
> An agent should read this file and create/update the repository content **exactly** as described below.
>
> Language: RU (with some EN technical terms where useful).  
> Repository goal: web UI for DTM “Gantt-style” diagrams and task views, powered by a future DTM API.

---

## 0) Repo outcomes

### MVP outcomes (no auth, no security, fast)
- Web UI renders **two views**:
  1) **By Designers** (grouped timelines)
  2) **By Tasks** (table + timeline)
- Data source: **temporary snapshot** (`/data/snapshot.example.json`) OR `GET /api/snapshot` if available.
- Filters: designer, status, search by title.
- Tooltip/panel for task details.
- Build as static site; can be deployed to Object Storage static hosting.

### Production outcomes
- Auth: **Yandex ID OAuth** + short-lived sessions (JWT issued by our backend).
- Optional: **magic short-lived links** (TTL + one-time), possibly requiring login.
- Admin panel: manage allowlist/users, generate/revoke links, audit log.
- Backend: serverless containers/functions; gateway auth; DB for access + logs.
- Data: stable API contract with versioning + optional incremental updates.

---

## 1) Repository structure (target)

Create the following structure (monorepo):

```

dtm-web/
apps/
web/
index.html
package.json
vite.config.ts
tsconfig.json
src/
main.tsx
app/
App.tsx
routes.tsx
pages/
DesignersPage.tsx
TasksPage.tsx
components/
TopBar.tsx
FiltersBar.tsx
Layout.tsx
EmptyState.tsx
ErrorBanner.tsx
LoadingState.tsx
Tooltip.tsx
TaskDetailsDrawer.tsx
gantt/
TimeScale.ts
TimelineGrid.tsx
TaskBar.tsx
DesignersTimeline.tsx
TasksTimeline.tsx
types.ts
layout.ts
data/
api.ts
normalize.ts
useSnapshot.ts
styles/
globals.css
utils/
date.ts
text.ts
perf.ts
packages/
schema/
package.json
README.md
snapshot.schema.json
snapshot.ts
data/
snapshot.example.json
docs/
PRODUCT.md
ARCHITECTURE.md
MVP_PLAN.md
ROADMAP.md
API_CONTRACT.md
SECURITY.md
GEMINI.md
agent/
INSTRUCTIONS.md
TASKS.md
.editorconfig
.gitignore
LICENSE
CONTRIBUTING.md
README.md

````

Notes:
- MVP can run with only `apps/web` + `data/snapshot.example.json` + `packages/schema`.
- `packages/schema` contains **JSON Schema + TS types**. Agent should keep schema and types consistent.
- Prod docs exist now but may contain TODO markers.

---

## 2) Tech choices (baseline)

### Web (MVP)
- React 18 + TypeScript
- Vite
- Minimal CSS (plain CSS) or Tailwind **optional** (avoid heavy setup for MVP)
- No SSR required
- Rendering Gantt:
  - Use **SVG-based timeline** (fast, precise enough, easy to style)
  - Later can replace parts with Canvas/D3 if needed

### Data contract (MVP)
- A normalized `SnapshotV1` JSON structure (defined below)
- A “soft adapter” layer (`normalize.ts`) that can accept:
  - local example snapshot
  - future API response (possibly different) and normalize it

---

## 3) Data model (SnapshotV1)

### Canonical normalized model
- `meta`: information about generation time and version
- `people[]`: designers
- `tasks[]`: tasks, each with dates, owner, status, and optional dependencies
- `groups[]`: optional grouping (projects/streams)
- `enums`: optional status mapping

**Rules**
- All dates are ISO 8601 date strings or datetime strings in UTC.
- For MVP: treat dates as **date-only** (`YYYY-MM-DD`) but allow datetime.

---

## 4) Files content — CREATE/UPDATE EXACT TEXT

Below are the exact contents to create.  
Agent must create each file with the content exactly as provided.

---

# FILE: README.md
```md
# DTM Web Frontend

Web UI for viewing DTM task timelines (Gantt-style) and operational views:
- **By Designers** — timelines grouped by designer
- **By Tasks** — table + timeline

This repo is designed to work with a future DTM API but can run purely from a local snapshot JSON (MVP).

## MVP scope
- Two pages: By Designers, By Tasks
- Filters: designer, status, search
- Tooltip / task details drawer
- Data source:
  - `data/snapshot.example.json` (local), or
  - `GET /api/snapshot` (when available)

> MVP intentionally ignores auth and security to maximize delivery speed.

## Local dev

### Requirements
- Node.js 20+ recommended
- pnpm (recommended) or npm

### Install
From repo root:
```bash
cd apps/web
npm install
````

### Run

```bash
npm run dev
```

By default, the app loads snapshot from:

* `/data/snapshot.example.json` (served by Vite as static asset)

## Build

```bash
npm run build
npm run preview
```

## Deploy (MVP static hosting)

The build output is `apps/web/dist/`.
It can be hosted as a static site (e.g., Yandex Object Storage static website hosting).

## Docs

* Product / MVP / Prod: `docs/PRODUCT.md`
* Architecture: `docs/ARCHITECTURE.md`
* MVP implementation plan: `docs/MVP_PLAN.md`
* Roadmap to production: `docs/ROADMAP.md`
* API contract draft: `docs/API_CONTRACT.md`

## License

See `LICENSE`.

````

---

# FILE: CONTRIBUTING.md
```md
# Contributing

## Goals
- Keep MVP simple and shippable.
- Make the system easy for agents to modify using schemas and clear module boundaries.

## Workflow
1. Create a branch.
2. Make changes.
3. Ensure `apps/web` builds and runs locally.
4. Submit PR with a clear description.

## Code style
- TypeScript + React functional components
- Prefer small components and pure helper functions
- Avoid premature abstractions in MVP

## Commit messages
Use simple conventional style:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `chore: ...`

## Testing
MVP can be validated with:
- `npm run dev` smoke test
- manual checks of the two pages and filters

Production phase will add automated tests.
````

---

# FILE: LICENSE

```md
MIT License

Copyright (c) 2026

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

# FILE: .editorconfig

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

---

# FILE: .gitignore

```gitignore
# Node
node_modules
dist
.vite
*.log

# OS
.DS_Store
Thumbs.db

# Env
.env
.env.local
.env.*.local

# IDE
.idea
.vscode
```

---

# FILE: docs/PRODUCT.md

```md
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
```

---

# FILE: docs/ARCHITECTURE.md

```md
# Architecture

## High-level (MVP)

```

[Browser]
|
| (static assets)
v
[Static Hosting]  (Object Storage / local dev)
|
| (fetch snapshot JSON)
v
[Snapshot JSON] (local file OR API)

```

MVP focuses on UI correctness and data normalization.

---

## High-level (Production)

```

[Browser]
|
| 1) static UI
v
[Object Storage Static Hosting] ---- optional ---> [CDN]
|
| 2) API calls (JWT / magic token)
v
[API Gateway] ---auth---> [Serverless Containers / Functions]
|
v
[DB]
|
v
[Object Storage]
(snapshots + pre-signed URLs)

```

- Static UI is public; **data access is protected** via API.
- If snapshots are large files, backend returns **pre-signed URLs** for short-lived access.

---

## Web App internals (MVP)

### Layers
1) Data loading (`apps/web/src/data`)
- `useSnapshot.ts`: fetches snapshot from local or API.
- `api.ts`: fetch wrapper with base URL.
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

---

## Versioning strategy (Prod)
- API returns `meta.version = "v1"` etc.
- UI supports latest version; can keep adapters for older versions if needed.

---

## Security (Prod)
- Auth: Yandex ID OAuth -> backend issues short-lived JWT for API.
- Magic links: backend generates token (store hashed), TTL, one-time.
- API gateway can validate JWT; magic link validation remains backend logic.
```

---

# FILE: docs/MVP_PLAN.md

```md
# MVP Implementation Plan (Detailed)

## Phase 0 — Repo bootstrap (0.1)
- Create repo structure as in Master Spec.
- Add basic docs (this pack).
- Add `data/snapshot.example.json`.
- Add `packages/schema` with JSON Schema + TS types.
- Add `apps/web` Vite React TS app.

Deliverable:
- `npm run dev` works and shows a placeholder page.

---

## Phase 1 — Data pipeline (0.2)
1) Implement `useSnapshot.ts`:
- Try loading `/data/snapshot.example.json` by default.
- If env `VITE_API_BASE_URL` present, load `${base}/snapshot`.
- Use `normalize.ts` to return canonical `SnapshotV1`.

2) Add simple error states:
- Loading
- Error banner + retry button

Deliverable:
- App loads snapshot and prints counts (people/tasks) in UI.

---

## Phase 2 — UI skeleton (0.3)
- Add TopBar with route switch:
  - `/designers`
  - `/tasks`
- Add FiltersBar:
  - dropdown designer
  - dropdown status
  - search input

Deliverable:
- Navigation and filters exist (even before charts render).

---

## Phase 3 — Designers view (0.4)
- Implement `DesignersTimeline`:
  - group tasks by `ownerId`
  - compute visible date range (min start, max end; plus padding)
  - render per designer: label + task bars

Interactions:
- hover tooltip with title, dates, status
- click -> open drawer with full info

Deliverable:
- By Designers page renders timeline.

---

## Phase 4 — Tasks view (0.5)
- Implement `TasksPage`:
  - left side: table list (title, owner, status, dates)
  - right side: aligned timeline bars
- Basic alignment rules:
  - row height fixed (e.g., 28–32px)
  - timeline shares the same row y positions

Deliverable:
- By Tasks page renders table + timeline aligned.

---

## Phase 5 — Filters + search (0.6)
- Apply filtering to the task list used by both pages:
  - owner filter
  - status filter
  - search in title (case-insensitive)

Deliverable:
- Filters work in both pages, UI remains responsive.

---

## Phase 6 — Build & deploy instructions (0.7)
- Ensure `npm run build` works.
- Document deployment to static hosting in README.

Deliverable:
- Build artifacts ready for Object Storage upload.

---

## Definition of Done (MVP)
- Two pages work end-to-end with example data.
- No crashes on missing optional fields.
- Reasonable styling (readable, stable).
- Ready to swap data source to API without UI rewrite.
```

---

# FILE: docs/ROADMAP.md

```md
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
```

---

# FILE: docs/API_CONTRACT.md

````md
# API Contract (Draft)

> MVP can ignore this. Production will finalize.

## Base
- `GET /snapshot` -> returns `SnapshotV1` JSON

## SnapshotV1 response
- Must satisfy JSON Schema in `packages/schema/snapshot.schema.json`

Example:
```json
{
  "meta": {
    "version": "v1",
    "generatedAt": "2026-03-02T12:00:00Z",
    "source": "dtm",
    "hash": "sha256:..."
  },
  "people": [
    { "id": "p1", "name": "Designer A" }
  ],
  "tasks": [
    {
      "id": "t1",
      "title": "Landing hero",
      "ownerId": "p1",
      "status": "in_progress",
      "start": "2026-03-01",
      "end": "2026-03-05",
      "tags": ["promo"],
      "groupId": "g1",
      "links": { "sheetRowUrl": "https://..." }
    }
  ],
  "groups": [
    { "id": "g1", "name": "Project X" }
  ],
  "enums": {
    "status": {
      "todo": "To do",
      "in_progress": "In progress",
      "review": "Review",
      "done": "Done"
    }
  }
}
````

## Future endpoints (optional)

* `GET /changes?since=<cursor>` -> incremental updates
* `GET /meta` -> quick metadata/etag for caching

````

---

# FILE: docs/SECURITY.md
```md
# Security (Production Notes)

> MVP intentionally does not implement this.

## Auth
- Yandex ID OAuth login.
- Backend issues short-lived JWT for API calls.

## Authorization
- Allowlist users (uid/email).
- Roles: viewer/admin.

## Magic links
- Token is random high-entropy value.
- Store only hashed token in DB.
- TTL and optional one-time use.
- Optional binding to Yandex user after login.

## Data access
- UI assets can remain public (static hosting).
- Protect API endpoints and snapshot files:
  - API returns pre-signed URLs for Object Storage objects when needed.
````

---

# FILE: docs/GEMINI.md

```md
# Gemini / Agent References

This project may use shared Gemini artifacts (links) for prompts and workflows.

- Primary shared thread (owner will update):  
  https://g.co/gemini/share/39ab0ece4f2d

Important:
- Do not store secrets in shared public links.
- Keep essential instructions duplicated inside repo docs to avoid link rot.
```

---

# FILE: agent/INSTRUCTIONS.md

```md
# Agent Instructions (Do This Exactly)

You are an implementation agent working on this repository.

## Primary rule
Follow `DTM Web Frontend — Master Spec` (root single-file doc) exactly.

## Steps
1) Ensure repository structure matches the spec.
2) Create/update all listed files with exact contents where provided.
3) Implement MVP code in `apps/web`:
   - Vite + React + TS
   - Load snapshot
   - Two pages
   - Filters
   - SVG timelines
4) Keep `packages/schema` consistent:
   - JSON Schema matches TS types
   - Example snapshot validates the schema

## MVP acceptance checklist
- `cd apps/web && npm i && npm run dev` works
- Designers page renders and is usable
- Tasks page renders table+timeline aligned
- Filters work
- No auth/security included

## Constraints
- Avoid adding heavy dependencies.
- Do not introduce backend in this repo (MVP uses local snapshot or simple fetch).
- Prioritize clarity over cleverness.
```

---

# FILE: agent/TASKS.md

```md
# Agent Task List

## MVP (must)
1) Bootstrap Vite React TS app in `apps/web`.
2) Add snapshot loader with fallback to local example.
3) Define `SnapshotV1` types and JSON schema in `packages/schema`.
4) Implement normalize layer: raw -> SnapshotV1.
5) Build Designers view:
   - group by owner
   - timeline bars
   - tooltip + details drawer
6) Build Tasks view:
   - table + aligned timeline
7) Filters + search shared logic
8) Basic styling for readability
9) Build scripts and README verified

## Post-MVP (later)
- Zoom levels (day/week/month)
- Virtualization for large lists
- Export PNG/PDF
- Production auth + admin
```

---

# FILE: packages/schema/package.json

```json
{
  "name": "@dtm/schema",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./snapshot.ts"
}
```

---

# FILE: packages/schema/README.md

```md
# @dtm/schema

Contains canonical data definitions for the DTM Web frontend.

## Contents
- `snapshot.schema.json` — JSON Schema for SnapshotV1
- `snapshot.ts` — TypeScript types for SnapshotV1

## Rule
Schema and TS types must be kept consistent.
Example file `data/snapshot.example.json` should validate against the schema.
```

---

# FILE: packages/schema/snapshot.ts

```ts
export type SnapshotMetaV1 = {
  version: "v1";
  generatedAt: string; // ISO 8601 datetime
  source?: string;
  hash?: string; // e.g. sha256:...
};

export type PersonV1 = {
  id: string;
  name: string;
};

export type GroupV1 = {
  id: string;
  name: string;
};

export type TaskLinksV1 = {
  sheetRowUrl?: string;
  externalUrl?: string;
};

export type TaskV1 = {
  id: string;
  title: string;
  ownerId?: string; // optional: unassigned tasks allowed
  status: string;
  start?: string; // ISO date or datetime
  end?: string;   // ISO date or datetime
  tags?: string[];
  groupId?: string;
  deps?: string[]; // task ids
  links?: TaskLinksV1;
  notes?: string;
};

export type SnapshotEnumsV1 = {
  status?: Record<string, string>; // code -> human label
};

export type SnapshotV1 = {
  meta: SnapshotMetaV1;
  people: PersonV1[];
  tasks: TaskV1[];
  groups?: GroupV1[];
  enums?: SnapshotEnumsV1;
};
```

---

# FILE: packages/schema/snapshot.schema.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.local/dtm/snapshot.v1.schema.json",
  "title": "SnapshotV1",
  "type": "object",
  "required": ["meta", "people", "tasks"],
  "properties": {
    "meta": {
      "type": "object",
      "required": ["version", "generatedAt"],
      "properties": {
        "version": { "type": "string", "const": "v1" },
        "generatedAt": { "type": "string" },
        "source": { "type": "string" },
        "hash": { "type": "string" }
      },
      "additionalProperties": false
    },
    "people": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "tasks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "status"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "ownerId": { "type": "string" },
          "status": { "type": "string" },
          "start": { "type": "string" },
          "end": { "type": "string" },
          "tags": { "type": "array", "items": { "type": "string" } },
          "groupId": { "type": "string" },
          "deps": { "type": "array", "items": { "type": "string" } },
          "links": {
            "type": "object",
            "properties": {
              "sheetRowUrl": { "type": "string" },
              "externalUrl": { "type": "string" }
            },
            "additionalProperties": false
          },
          "notes": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "groups": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name"],
        "properties": {
          "id": { "type": "string" },
          "name": { "type": "string" }
        },
        "additionalProperties": false
      }
    },
    "enums": {
      "type": "object",
      "properties": {
        "status": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": false
}
```

---

# FILE: data/snapshot.example.json

```json
{
  "meta": {
    "version": "v1",
    "generatedAt": "2026-03-02T12:00:00Z",
    "source": "example",
    "hash": "sha256:example"
  },
  "people": [
    { "id": "p-alex", "name": "Alex" },
    { "id": "p-nina", "name": "Nina" },
    { "id": "p-ivan", "name": "Ivan" }
  ],
  "groups": [
    { "id": "g-brand", "name": "Brand refresh" },
    { "id": "g-menu", "name": "Menu visuals" }
  ],
  "enums": {
    "status": {
      "todo": "To do",
      "in_progress": "In progress",
      "review": "Review",
      "done": "Done",
      "blocked": "Blocked"
    }
  },
  "tasks": [
    {
      "id": "t-100",
      "title": "Homepage hero concept",
      "ownerId": "p-alex",
      "status": "in_progress",
      "start": "2026-03-01",
      "end": "2026-03-05",
      "tags": ["web"],
      "groupId": "g-brand",
      "links": { "sheetRowUrl": "https://example.local/sheet/row/100" }
    },
    {
      "id": "t-101",
      "title": "Icon set v1",
      "ownerId": "p-alex",
      "status": "review",
      "start": "2026-03-04",
      "end": "2026-03-07",
      "tags": ["ui"],
      "groupId": "g-brand",
      "deps": ["t-100"]
    },
    {
      "id": "t-200",
      "title": "Drink menu layout",
      "ownerId": "p-nina",
      "status": "todo",
      "start": "2026-03-03",
      "end": "2026-03-08",
      "tags": ["print"],
      "groupId": "g-menu"
    },
    {
      "id": "t-201",
      "title": "Menu product renders",
      "ownerId": "p-ivan",
      "status": "blocked",
      "start": "2026-03-02",
      "end": "2026-03-10",
      "tags": ["3d"],
      "groupId": "g-menu",
      "notes": "Waiting for final product list."
    },
    {
      "id": "t-202",
      "title": "Social pack templates",
      "status": "todo",
      "start": "2026-03-06",
      "end": "2026-03-12",
      "tags": ["smm"],
      "groupId": "g-brand",
      "notes": "Unassigned task example."
    }
  ]
}
```

---

# FILE: apps/web/package.json

```json
{
  "name": "@dtm/web",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@types/react": "^18.3.4",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.2",
    "@vitejs/plugin-react": "^4.3.1"
  }
}
```

---

# FILE: apps/web/vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
```

---

# FILE: apps/web/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

---

# FILE: apps/web/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DTM Web</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

# FILE: apps/web/src/main.tsx

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./app/App";
import "./styles/globals.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

---

# FILE: apps/web/src/styles/globals.css

```css
:root {
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
  color: #111;
  background: #fff;
}

body {
  margin: 0;
}

a {
  color: inherit;
}

* {
  box-sizing: border-box;
}

.container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 16px;
}

.card {
  border: 1px solid #e6e6e6;
  border-radius: 12px;
  padding: 12px;
  background: #fff;
}

.row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.topbar {
  position: sticky;
  top: 0;
  background: #fff;
  border-bottom: 1px solid #eee;
  z-index: 10;
}

.nav {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  align-items: center;
}

.nav a {
  text-decoration: none;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.nav a.active {
  border-color: #ddd;
  background: #fafafa;
}

.filters {
  display: flex;
  gap: 10px;
  padding: 10px 16px 14px 16px;
  border-top: 1px solid #f2f2f2;
  flex-wrap: wrap;
}

input, select, button {
  font: inherit;
}

select, input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fff;
}

button {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid #ddd;
  background: #fafafa;
  cursor: pointer;
}

button:hover {
  background: #f3f3f3;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

@media (min-width: 960px) {
  .grid2 {
    grid-template-columns: 420px 1fr;
    align-items: start;
  }
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table th, .table td {
  border-bottom: 1px solid #f0f0f0;
  padding: 8px;
  text-align: left;
  vertical-align: middle;
}

.muted {
  color: #666;
}

.badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid #e5e5e5;
  background: #fafafa;
  font-size: 12px;
}

.drawerBackdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  display: flex;
  justify-content: flex-end;
  z-index: 50;
}

.drawer {
  width: min(520px, 92vw);
  height: 100%;
  background: #fff;
  border-left: 1px solid #eee;
  padding: 16px;
  overflow: auto;
}

.tooltip {
  position: fixed;
  z-index: 60;
  pointer-events: none;
  background: #111;
  color: #fff;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  max-width: 320px;
}
```

---

# FILE: apps/web/src/app/App.tsx

```tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { DesignersPage } from "../pages/DesignersPage";
import { TasksPage } from "../pages/TasksPage";

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/designers" replace />} />
        <Route path="/designers" element={<DesignersPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="*" element={<Navigate to="/designers" replace />} />
      </Routes>
    </Layout>
  );
}
```

---

# FILE: apps/web/src/components/Layout.tsx

```tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { FiltersBar, FiltersState } from "./FiltersBar";

export type LayoutContextValue = {
  filters: FiltersState;
  setFilters: React.Dispatch<React.SetStateAction<FiltersState>>;
};

export const LayoutContext = React.createContext<LayoutContextValue | null>(null);

export function Layout(props: { children: React.ReactNode }) {
  const [filters, setFilters] = React.useState<FiltersState>({
    ownerId: "",
    status: "",
    search: ""
  });

  return (
    <LayoutContext.Provider value={{ filters, setFilters }}>
      <div className="topbar">
        <div className="nav">
          <strong>DTM Web</strong>
          <NavLink to="/designers" className={({ isActive }) => (isActive ? "active" : "")}>
            By designers
          </NavLink>
          <NavLink to="/tasks" className={({ isActive }) => (isActive ? "active" : "")}>
            By tasks
          </NavLink>
        </div>
        <FiltersBar />
      </div>
      <div className="container">{props.children}</div>
    </LayoutContext.Provider>
  );
}
```

---

# FILE: apps/web/src/components/FiltersBar.tsx

```tsx
import React from "react";
import { LayoutContext } from "./Layout";
import { useSnapshot } from "../data/useSnapshot";

export type FiltersState = {
  ownerId: string;
  status: string;
  search: string;
};

export function FiltersBar() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, reload, isLoading, error } = useSnapshot();

  if (!ctx) return null;

  const { filters, setFilters } = ctx;

  const people = snapshot?.people ?? [];
  const statusEntries = Object.entries(snapshot?.enums?.status ?? {});

  return (
    <div className="filters">
      <select
        value={filters.ownerId}
        onChange={(e) => setFilters((s) => ({ ...s, ownerId: e.target.value }))}
        aria-label="Designer filter"
      >
        <option value="">All designers</option>
        {people.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
        aria-label="Status filter"
      >
        <option value="">All statuses</option>
        {statusEntries.map(([code, label]) => (
          <option key={code} value={code}>{label}</option>
        ))}
      </select>

      <input
        value={filters.search}
        onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))}
        placeholder="Search tasks..."
        aria-label="Search"
      />

      <button onClick={reload} disabled={isLoading}>
        {isLoading ? "Loading..." : "Refresh"}
      </button>

      {error ? <span className="muted">Error: {String(error)}</span> : null}
    </div>
  );
}
```

---

# FILE: apps/web/src/components/EmptyState.tsx

```tsx
import React from "react";

export function EmptyState(props: { title: string; description?: string }) {
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{props.title}</h3>
      {props.description ? <p className="muted">{props.description}</p> : null}
    </div>
  );
}
```

---

# FILE: apps/web/src/components/LoadingState.tsx

```tsx
import React from "react";

export function LoadingState() {
  return (
    <div className="card">
      <strong>Loading…</strong>
      <div className="muted">Fetching snapshot data.</div>
    </div>
  );
}
```

---

# FILE: apps/web/src/components/ErrorBanner.tsx

```tsx
import React from "react";

export function ErrorBanner(props: { error: unknown; onRetry: () => void }) {
  return (
    <div className="card">
      <strong>Error loading data</strong>
      <div className="muted" style={{ marginTop: 6 }}>{String(props.error)}</div>
      <div style={{ marginTop: 10 }}>
        <button onClick={props.onRetry}>Retry</button>
      </div>
    </div>
  );
}
```

---

# FILE: apps/web/src/components/Tooltip.tsx

```tsx
import React from "react";

export type TooltipState =
  | { visible: false }
  | { visible: true; x: number; y: number; content: React.ReactNode };

export function Tooltip(props: { state: TooltipState }) {
  if (!props.state.visible) return null;
  const { x, y, content } = props.state;
  return (
    <div className="tooltip" style={{ left: x + 12, top: y + 12 }}>
      {content}
    </div>
  );
}
```

---

# FILE: apps/web/src/components/TaskDetailsDrawer.tsx

```tsx
import React from "react";
import { TaskV1, PersonV1, GroupV1 } from "@dtm/schema/snapshot";

export function TaskDetailsDrawer(props: {
  task: TaskV1 | null;
  people: PersonV1[];
  groups?: GroupV1[];
  statusLabels?: Record<string, string>;
  onClose: () => void;
}) {
  const t = props.task;
  if (!t) return null;

  const owner = props.people.find((p) => p.id === t.ownerId);
  const group = props.groups?.find((g) => g.id === t.groupId);
  const statusLabel = props.statusLabels?.[t.status] ?? t.status;

  return (
    <div className="drawerBackdrop" onClick={props.onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{t.title}</h2>
          <button onClick={props.onClose}>Close</button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <span className="badge">ID: {t.id}</span>
            <span className="badge">Status: {statusLabel}</span>
            <span className="badge">Owner: {owner ? owner.name : "Unassigned"}</span>
            {group ? <span className="badge">Group: {group.name}</span> : null}
          </div>
        </div>

        <div style={{ marginTop: 12 }} className="card">
          <div><strong>Dates</strong></div>
          <div className="muted" style={{ marginTop: 6 }}>
            Start: {t.start ?? "—"}<br />
            End: {t.end ?? "—"}
          </div>
        </div>

        {t.tags?.length ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Tags</strong></div>
            <div className="row" style={{ flexWrap: "wrap", marginTop: 8 }}>
              {t.tags.map((tag) => <span key={tag} className="badge">{tag}</span>)}
            </div>
          </div>
        ) : null}

        {t.notes ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Notes</strong></div>
            <div className="muted" style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{t.notes}</div>
          </div>
        ) : null}

        {t.links?.sheetRowUrl ? (
          <div style={{ marginTop: 12 }} className="card">
            <div><strong>Links</strong></div>
            <div style={{ marginTop: 8 }}>
              <a href={t.links.sheetRowUrl} target="_blank" rel="noreferrer">Open sheet row</a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
```

---

# FILE: apps/web/src/data/api.ts

```ts
const DEFAULT_LOCAL_SNAPSHOT = "/data/snapshot.example.json";

export function getApiBaseUrl(): string | null {
  const v = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return v && v.trim().length ? v.trim() : null;
}

export async function fetchSnapshot(): Promise<any> {
  const base = getApiBaseUrl();
  const url = base ? `${base.replace(/\/$/, "")}/snapshot` : DEFAULT_LOCAL_SNAPSHOT;
  const res = await fetch(url, { headers: { "accept": "application/json" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}
```

---

# FILE: apps/web/src/data/normalize.ts

```ts
import { SnapshotV1 } from "@dtm/schema/snapshot";

/**
 * In MVP we expect the payload to already be SnapshotV1.
 * Later this adapter can be expanded to map arbitrary API responses to SnapshotV1.
 */
export function normalizeToSnapshotV1(payload: any): SnapshotV1 {
  if (!payload || !payload.meta || payload.meta.version !== "v1") {
    throw new Error("Unsupported snapshot payload: missing meta.version=v1");
  }
  return payload as SnapshotV1;
}
```

---

# FILE: apps/web/src/data/useSnapshot.ts

```tsx
import React from "react";
import { SnapshotV1 } from "@dtm/schema/snapshot";
import { fetchSnapshot } from "./api";
import { normalizeToSnapshotV1 } from "./normalize";

let cached: SnapshotV1 | null = null;

export function useSnapshot() {
  const [snapshot, setSnapshot] = React.useState<SnapshotV1 | null>(cached);
  const [isLoading, setIsLoading] = React.useState<boolean>(!cached);
  const [error, setError] = React.useState<unknown>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const raw = await fetchSnapshot();
      const normalized = normalizeToSnapshotV1(raw);
      cached = normalized;
      setSnapshot(normalized);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!cached) void load();
  }, [load]);

  return {
    snapshot,
    isLoading,
    error,
    reload: load
  };
}
```

---

# FILE: apps/web/src/utils/date.ts

```ts
export function parseIsoDateOrDateTime(v?: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function dateToYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

export function minDate(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

export function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function startOfDayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
```

---

# FILE: apps/web/src/gantt/types.ts

```ts
export type TimeRange = {
  start: Date;
  end: Date;
};

export type RenderTask = {
  id: string;
  title: string;
  ownerId?: string;
  status: string;
  start: Date | null;
  end: Date | null;
  groupId?: string;
};
```

---

# FILE: apps/web/src/gantt/TimeScale.ts

```ts
import { TimeRange } from "./types";

export type TimeScale = {
  range: TimeRange;
  pxPerDay: number;
  leftPadding: number;
  width: number;
  xForDate: (d: Date) => number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function createTimeScale(range: TimeRange, width: number): TimeScale {
  const leftPadding = 8;
  const days = Math.max(1, Math.round((range.end.getTime() - range.start.getTime()) / DAY_MS));
  const pxPerDay = Math.max(8, Math.floor((width - leftPadding * 2) / days));
  const xForDate = (d: Date) => {
    const deltaDays = (d.getTime() - range.start.getTime()) / DAY_MS;
    return leftPadding + deltaDays * pxPerDay;
  };

  return { range, pxPerDay, leftPadding, width, xForDate };
}
```

---

# FILE: apps/web/src/gantt/layout.ts

```ts
import { parseIsoDateOrDateTime, addDays, minDate, maxDate, startOfDayUtc } from "../utils/date";
import { TimeRange, RenderTask } from "./types";

export function toRenderTasks(tasks: Array<{ id: string; title: string; ownerId?: string; status: string; start?: string; end?: string; groupId?: string; }>): RenderTask[] {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    ownerId: t.ownerId,
    status: t.status,
    start: parseIsoDateOrDateTime(t.start),
    end: parseIsoDateOrDateTime(t.end),
    groupId: t.groupId
  }));
}

export function computeRange(tasks: RenderTask[]): TimeRange {
  const now = startOfDayUtc(new Date());
  let start = now;
  let end = addDays(now, 14);

  for (const t of tasks) {
    if (t.start) start = minDate(start, startOfDayUtc(t.start));
    if (t.end) end = maxDate(end, startOfDayUtc(t.end));
  }

  // pad
  start = addDays(start, -2);
  end = addDays(end, 2);
  if (end.getTime() <= start.getTime()) end = addDays(start, 14);

  return { start, end };
}

export function barXWidth(xForDate: (d: Date) => number, start: Date | null, end: Date | null): { x: number; w: number } {
  if (!start && !end) return { x: 0, w: 0 };
  const s = start ?? end!;
  const e = end ?? start!;
  const x1 = xForDate(s);
  const x2 = xForDate(addDays(e, 1)); // include end day
  return { x: x1, w: Math.max(2, x2 - x1) };
}
```

---

# FILE: apps/web/src/gantt/TimelineGrid.tsx

```tsx
import React from "react";
import { TimeScale } from "./TimeScale";
import { dateToYmd, addDays } from "../utils/date";

const DAY_MS = 24 * 60 * 60 * 1000;

export function TimelineGrid(props: { scale: TimeScale; height: number }) {
  const { scale, height } = props;

  const days = Math.round((scale.range.end.getTime() - scale.range.start.getTime()) / DAY_MS);
  const ticks = [];
  for (let i = 0; i <= days; i++) {
    const d = addDays(scale.range.start, i);
    const x = scale.xForDate(d);
    const isWeek = d.getUTCDay() === 1; // Monday
    ticks.push({ x, label: isWeek ? dateToYmd(d) : "" , isWeek });
  }

  return (
    <g>
      {ticks.map((t, idx) => (
        <g key={idx}>
          <line x1={t.x} y1={0} x2={t.x} y2={height} stroke={t.isWeek ? "#e2e2e2" : "#f2f2f2"} />
          {t.label ? (
            <text x={t.x + 2} y={12} fontSize={10} fill="#666">{t.label}</text>
          ) : null}
        </g>
      ))}
    </g>
  );
}
```

---

# FILE: apps/web/src/gantt/TaskBar.tsx

```tsx
import React from "react";
import { RenderTask } from "./types";
import { TimeScale } from "./TimeScale";
import { barXWidth } from "./layout";

export function TaskBar(props: {
  task: RenderTask;
  scale: TimeScale;
  y: number;
  rowH: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const { task, scale, y, rowH } = props;
  const { x, w } = barXWidth(scale.xForDate, task.start, task.end);
  if (w <= 0) return null;

  const h = Math.max(8, rowH - 8);
  const ry = y + (rowH - h) / 2;

  return (
    <rect
      x={x}
      y={ry}
      width={w}
      height={h}
      rx={8}
      ry={8}
      fill="#111"
      opacity={0.10}
      stroke="#111"
      strokeOpacity={0.25}
      onMouseMove={(e) => props.onHover(e, task)}
      onMouseLeave={props.onLeave}
      onClick={() => props.onClick(task)}
      style={{ cursor: "pointer" }}
    />
  );
}
```

---

# FILE: apps/web/src/gantt/DesignersTimeline.tsx

```tsx
import React from "react";
import { PersonV1, TaskV1 } from "@dtm/schema/snapshot";
import { RenderTask } from "./types";
import { computeRange, toRenderTasks } from "./layout";
import { createTimeScale } from "./TimeScale";
import { TimelineGrid } from "./TimelineGrid";
import { TaskBar } from "./TaskBar";

export function DesignersTimeline(props: {
  people: PersonV1[];
  tasks: TaskV1[];
  width: number;
  height: number;
  rowH?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const rowH = props.rowH ?? 32;

  const renderTasks = React.useMemo(() => toRenderTasks(props.tasks), [props.tasks]);
  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width), [range, props.width]);

  const byOwner = React.useMemo(() => {
    const map = new Map<string, RenderTask[]>();
    for (const t of renderTasks) {
      const key = t.ownerId ?? "__unassigned__";
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return map;
  }, [renderTasks]);

  const rows: Array<{ id: string; label: string; tasks: RenderTask[] }> = [];
  for (const p of props.people) rows.push({ id: p.id, label: p.name, tasks: byOwner.get(p.id) ?? [] });
  const unassigned = byOwner.get("__unassigned__");
  if (unassigned?.length) rows.push({ id: "__unassigned__", label: "Unassigned", tasks: unassigned });

  const labelW = 200;
  const svgW = props.width;
  const svgH = Math.max(props.height, rows.length * rowH + 24);

  return (
    <svg width={svgW} height={svgH} style={{ display: "block" }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#fff" />
      <g transform={`translate(${labelW}, 20)`}>
        <TimelineGrid scale={scale} height={svgH - 20} />
        {rows.map((r, i) => {
          const y = i * rowH;
          return (
            <g key={r.id}>
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f2f2f2" />
              {r.tasks.map((t) => (
                <TaskBar
                  key={t.id}
                  task={t}
                  scale={scale}
                  y={y}
                  rowH={rowH}
                  onHover={props.onHover}
                  onLeave={props.onLeave}
                  onClick={props.onClick}
                />
              ))}
            </g>
          );
        })}
      </g>

      {/* labels */}
      <g transform="translate(0, 20)">
        {rows.map((r, i) => (
          <text key={r.id} x={8} y={i * rowH + 20} fontSize={13} fill="#111">
            {r.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
```

---

# FILE: apps/web/src/gantt/TasksTimeline.tsx

```tsx
import React from "react";
import { TaskV1 } from "@dtm/schema/snapshot";
import { RenderTask } from "./types";
import { computeRange, toRenderTasks } from "./layout";
import { createTimeScale } from "./TimeScale";
import { TimelineGrid } from "./TimelineGrid";
import { TaskBar } from "./TaskBar";

export function TasksTimeline(props: {
  tasks: TaskV1[];
  width: number;
  rowH?: number;
  onHover: (e: React.MouseEvent, t: RenderTask) => void;
  onLeave: () => void;
  onClick: (t: RenderTask) => void;
}) {
  const rowH = props.rowH ?? 32;

  const renderTasks = React.useMemo(() => toRenderTasks(props.tasks), [props.tasks]);
  const range = React.useMemo(() => computeRange(renderTasks), [renderTasks]);
  const scale = React.useMemo(() => createTimeScale(range, props.width), [range, props.width]);

  const svgW = props.width;
  const svgH = Math.max(120, props.tasks.length * rowH + 24);

  return (
    <svg width={svgW} height={svgH} style={{ display: "block" }}>
      <rect x={0} y={0} width={svgW} height={svgH} fill="#fff" />
      <g transform="translate(0, 20)">
        <TimelineGrid scale={scale} height={svgH - 20} />
        {renderTasks.map((t, i) => {
          const y = i * rowH;
          return (
            <g key={t.id}>
              <line x1={0} y1={y + rowH} x2={svgW} y2={y + rowH} stroke="#f2f2f2" />
              <TaskBar
                task={t}
                scale={scale}
                y={y}
                rowH={rowH}
                onHover={props.onHover}
                onLeave={props.onLeave}
                onClick={props.onClick}
              />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
```

---

# FILE: apps/web/src/pages/DesignersPage.tsx

```tsx
import React from "react";
import { LayoutContext } from "../components/Layout";
import { useSnapshot } from "../data/useSnapshot";
import { LoadingState } from "../components/LoadingState";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { DesignersTimeline } from "../gantt/DesignersTimeline";
import { RenderTask } from "../gantt/types";

export function DesignersPage() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, isLoading, error, reload } = useSnapshot();

  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;
  if (!ctx) return null;

  const { filters } = ctx;

  const tasks = snapshot.tasks.filter((t) => {
    if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = selectedId ? snapshot.tasks.find((t) => t.id === selectedId) ?? null : null;

  const onHover = (e: React.MouseEvent, t: RenderTask) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div style={{ fontWeight: 600 }}>{t.title}</div>
          <div style={{ opacity: 0.85, marginTop: 4 }}>
            Status: {snapshot.enums?.status?.[t.status] ?? t.status}
          </div>
        </div>
      )
    });
  };

  const onLeave = () => setTooltip({ visible: false });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>By designers</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        Tasks: {tasks.length} • Generated: {snapshot.meta.generatedAt}
      </div>

      <DesignersTimeline
        people={snapshot.people}
        tasks={tasks}
        width={1100}
        height={Math.max(260, snapshot.people.length * 40)}
        onHover={onHover}
        onLeave={onLeave}
        onClick={(t) => setSelectedId(t.id)}
      />

      <Tooltip state={tooltip} />

      <TaskDetailsDrawer
        task={selectedTask}
        people={snapshot.people}
        groups={snapshot.groups}
        statusLabels={snapshot.enums?.status}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
```

---

# FILE: apps/web/src/pages/TasksPage.tsx

```tsx
import React from "react";
import { LayoutContext } from "../components/Layout";
import { useSnapshot } from "../data/useSnapshot";
import { LoadingState } from "../components/LoadingState";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { Tooltip, TooltipState } from "../components/Tooltip";
import { TaskDetailsDrawer } from "../components/TaskDetailsDrawer";
import { TasksTimeline } from "../gantt/TasksTimeline";
import { RenderTask } from "../gantt/types";

export function TasksPage() {
  const ctx = React.useContext(LayoutContext);
  const { snapshot, isLoading, error, reload } = useSnapshot();

  const [tooltip, setTooltip] = React.useState<TooltipState>({ visible: false });
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorBanner error={error} onRetry={reload} />;
  if (!snapshot) return <EmptyState title="No data" description="Snapshot is empty." />;
  if (!ctx) return null;

  const { filters } = ctx;

  const peopleById = new Map(snapshot.people.map((p) => [p.id, p.name]));
  const statusLabels = snapshot.enums?.status ?? {};

  const tasks = snapshot.tasks.filter((t) => {
    if (filters.ownerId && t.ownerId !== filters.ownerId) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.search && !t.title.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = selectedId ? snapshot.tasks.find((t) => t.id === selectedId) ?? null : null;

  const onHover = (e: React.MouseEvent, t: RenderTask) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      content: (
        <div>
          <div style={{ fontWeight: 600 }}>{t.title}</div>
          <div style={{ opacity: 0.85, marginTop: 4 }}>
            Owner: {t.ownerId ? (peopleById.get(t.ownerId) ?? t.ownerId) : "Unassigned"}
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>
            Status: {statusLabels[t.status] ?? t.status}
          </div>
        </div>
      )
    });
  };

  const onLeave = () => setTooltip({ visible: false });

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>By tasks</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        Tasks: {tasks.length} • Generated: {snapshot.meta.generatedAt}
      </div>

      <div className="grid2">
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Dates</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} style={{ cursor: "pointer" }} onClick={() => setSelectedId(t.id)}>
                  <td>{t.title}</td>
                  <td className="muted">{t.ownerId ? (peopleById.get(t.ownerId) ?? t.ownerId) : "—"}</td>
                  <td><span className="badge">{statusLabels[t.status] ?? t.status}</span></td>
                  <td className="muted">{(t.start ?? "—") + " → " + (t.end ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ overflow: "auto" }}>
          <TasksTimeline
            tasks={tasks}
            width={760}
            onHover={onHover}
            onLeave={onLeave}
            onClick={(t) => setSelectedId(t.id)}
          />
        </div>
      </div>

      <Tooltip state={tooltip} />

      <TaskDetailsDrawer
        task={selectedTask}
        people={snapshot.people}
        groups={snapshot.groups}
        statusLabels={snapshot.enums?.status}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
```

---

## 5) Final notes for agent

### Validate MVP

* From repo root:

  * `cd apps/web`
  * `npm install`
  * `npm run dev`
* Open:

  * `/designers`
  * `/tasks`
* Verify filters update both pages.

### Future work

* Replace hardcoded SVG widths with responsive container measurement (ResizeObserver).
* Add zoom (day/week/month).
* Add performance (virtualization) if needed.

---

END OF MASTER SPEC

```
```
