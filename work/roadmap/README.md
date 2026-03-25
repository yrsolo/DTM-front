# Roadmap

Active campaign priorities are defined in `work/now/*`.

## In priority

| CAM | Goal | Priority | Status | Link |
|---|---|---|---|---|
| CAM-API-V2-LOADING-SWR-CACHE | Stale-while-revalidate loading and local cache UX | P0 | active-now | `work/roadmap/campaigns/CAM-API-V2-LOADING-SWR-CACHE/` |
| CAM-SCHEMA-CONTRACT-GOVERNANCE | Align snapshot types/schema + add validation and guarantees | P1 | done | `work/roadmap/campaigns/CAM-SCHEMA-CONTRACT-GOVERNANCE/` |

## Deferred
- CDN/CI/layout campaigns are intentionally deprioritized for now.

## Workbench Authoring direction

Workbench work is being realigned from inspector-centric slices to a future standalone authoring product.

Canonical journey:

`Parse -> Enrich -> Inspect -> Tune -> Consolidate -> Persist`

Canonical persistence identity is source-analysis-first. Runtime/fiber/DOM are projection and preview layers, not the basis for `Persist`.

Authoring-product campaigns:

- `CAM-WORKBENCH-AUTHORING-VISION`
- `CAM-WORKBENCH-SOURCE-GRAPH`
- `CAM-WORKBENCH-AUTHORING-MODEL`
- `CAM-WORKBENCH-LIVE-PREVIEW`
- `CAM-WORKBENCH-CONSOLIDATION`
- `CAM-WORKBENCH-SOURCE-SYNC`
- `CAM-WORKBENCH-HARDENING`

Legacy `CAM-WORKBENCH-INSPECTOR-*` campaigns remain as groundwork for the shell, pick mode, tree UI, and host bridge, but they are no longer the product roadmap center.
