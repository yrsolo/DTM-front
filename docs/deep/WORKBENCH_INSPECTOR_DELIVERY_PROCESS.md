# Workbench Inspector Delivery Process

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

Current roadmap is split into clean slices:

- `CAM-WORKBENCH-INSPECTOR-FOUNDATION`
- `CAM-WORKBENCH-INSPECTOR-NAVIGATION`
- `CAM-WORKBENCH-INSPECTOR-FOCUS-SETS`
- `CAM-WORKBENCH-INSPECTOR-BINDINGS`
- `CAM-WORKBENCH-INSPECTOR-LIVE-COVERAGE`

Current implementation status:

- foundation shipped
- live selection shipped, with package-owned pick mode and page shield
- DOM-first hierarchy tree shipped in the package shell
- focus-set marking and local persistence shipped
- bindings are active as semantic enrichment for current app targets
- Figma-like shell shipped with left tree, right properties panel, draggable launcher, and collapse/expand flow

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
- hierarchy tree must come from DOM-derived nodes and stay usable even without semantic app mapping
- focus set must survive reload through local dev-only persistence
- no package import points back into app code
- current workbench remains untouched when inspector is disabled
