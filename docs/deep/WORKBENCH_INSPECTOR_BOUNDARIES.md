# Workbench Inspector Boundaries

## Package boundary

`packages/workbench-inspector/` must stay:

- domain-agnostic
- free of imports from `apps/web/**`
- unaware of DTM routes, auth, promo, timeline, backend, and runtime control schemas

The package may know only:

- inspector state
- generic target contracts
- generic overlay and panel primitives
- host-provided adapter contracts

## App integration boundary

`apps/web/src/inspector-integration/` is the only allowed app-specific bridge.

It owns:

- activation rules
- target registry
- ownership mapping
- workbench bridge actions

It must stay thin and must not become a second workbench implementation.

## Ownership boundary

Inspector is not a source of truth for runtime values.

Canonical ownership remains with the current workbench and existing runtime models:

- design controls
- key colors
- runtime defaults
- current workbench layout/taxonomy
