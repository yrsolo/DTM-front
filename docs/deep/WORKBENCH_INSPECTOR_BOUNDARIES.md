# Workbench Inspector Boundaries

## Package boundary

This page describes the current inspector-shell boundary, not the final product-core boundary.

`packages/workbench-inspector/` must stay:

- domain-agnostic
- free of imports from `apps/web/**`
- unaware of DTM routes, auth, promo, timeline, backend, and runtime control schemas

The package may know only:

- inspector state
- generic node and adapter contracts
- generic overlay and panel primitives
- host-provided adapter contracts
- DOM scanning and local UI persistence

For the future standalone direction, see [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md).
Authoring-product rule: product core must stay host-agnostic and manual page-by-page tree authoring must remain fallback-only.
Canonical source-analysis and `SourceGraph` ownership live outside this package; see [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md).

## App integration boundary

`apps/web/src/inspector-integration/` is the only allowed app-specific bridge.

It owns:

- activation rules
- target registry
- ownership mapping
- workbench bridge actions
- optional semantic/property enrichment

It must stay thin and must not become a second workbench implementation.

For the future authoring product, this host bridge should evolve into adapters rather than app-owned product logic:

- source parser adapter
- runtime projection adapter
- authoring enrichment adapter
- source sync adapter
- host shell integration adapter

## Ownership boundary

Inspector is not a source of truth for runtime values.

Canonical ownership remains with the current workbench and existing runtime models:

- design controls
- key colors
- runtime defaults
- current workbench layout/taxonomy

For the current runtime expression of these boundaries, see [WORKBENCH_INSPECTOR_TECHNICAL.md](WORKBENCH_INSPECTOR_TECHNICAL.md).
