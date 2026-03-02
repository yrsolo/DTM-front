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
