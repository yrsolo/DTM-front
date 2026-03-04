# DTM-front

Web frontend for the DTM (Designers Task Manager) system.

## What it does
- Fetches a DTM **snapshot** from the backend API (or local example JSON for MVP).
- Renders two main views:
  - **By Designers** (grouped timelines)
  - **By Tasks** (table + timeline)
- Provides filters (designer/status/search) and task details panel.

## Data
- MVP can use `data/snapshot.example.json`.
- Production will use the DTM API (`/api/v2/frontend` or a dedicated `/snapshot`) with auth.

## Tech
- React + TypeScript (Vite)
- Shared schema/types under `packages/schema`

## Where to read next
- System docs: `docs/README.md`
- Deploy guide: `docs/DEPLOY.md`
- Delivery/process (campaigns, now, roadmap, archive): `work/README.md`

License: see `LICENSE`.
