# Workbench Inspector Delivery Process

This page tracks rollout shape and acceptance criteria for the current inspector shell. For the current behavior of the running system, use [WORKBENCH_INSPECTOR_TECHNICAL.md](WORKBENCH_INSPECTOR_TECHNICAL.md) as the primary reference. For the future product roadmap, use [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md).

## Foundation goals

The first delivery slice must provide:

- package skeleton
- narrow public API
- thin app integration seam
- local dev-only activation path
- no-op mount path
- baseline documentation

## Explicit non-goals

Foundation must not ship:

- hover or selection overlay behavior
- workbench focus switching UX
- runtime value editing
- backend persistence
- production exposure

## Current delivery progression

Current shell groundwork was split into these slices:

- `CAM-WORKBENCH-INSPECTOR-FOUNDATION`
- `CAM-WORKBENCH-INSPECTOR-NAVIGATION`
- `CAM-WORKBENCH-INSPECTOR-FOCUS-SETS`
- `CAM-WORKBENCH-INSPECTOR-BINDINGS`
- `CAM-WORKBENCH-INSPECTOR-LIVE-COVERAGE`

These slices are no longer the center of the product roadmap. They are considered groundwork for the future authoring product.

Current implementation status:

- foundation shipped
- live selection shipped, with package-owned pick mode and page shield
- DOM-first hierarchy tree shipped in the package shell
- focus-set marking and local persistence shipped
- bindings are active as semantic enrichment for current app targets
- Figma-like shell shipped with left tree, right properties panel, draggable launcher, and collapse/expand flow
- branch toggling is available through real chevrons and repeated click on the selected expandable row
- SVG-backed runtime nodes can participate in the tree, so timeline-like surfaces no longer stop at the outer container

Still out of scope for current rollout:

- runtime value editing inside inspector
- a second editor state
- page-builder behavior
- production or test-contour exposure

## Acceptance checks

- `apps/web` builds successfully
- inspector stays disabled by default
- activation requires both dev mode and explicit local opt-in
- pick mode must explicitly disable page interaction while active and restore it when turned off
- the inspector shell itself must stay interactive while pick mode is on
- hierarchy tree must stay usable as the current shell layer, but future product planning must treat `SourceGraph` as the primary tree
- chevrons must appear only on nodes that actually have children
- focus set must survive reload through local dev-only persistence
- no package import points back into app code
- current workbench remains untouched when inspector is disabled
