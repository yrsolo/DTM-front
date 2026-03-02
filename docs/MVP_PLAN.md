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
