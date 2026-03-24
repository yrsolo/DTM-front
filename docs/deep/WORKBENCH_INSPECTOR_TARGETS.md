# Workbench Inspector Targets

## Rule

The inspector works on live DOM-derived nodes first, then enriches them with semantic targets when the host app can provide that mapping.

DOM-first nodes are used by:

- pick mode and canvas inspect
- hierarchy navigation
- focus-set marking
- generic properties inspection

Semantic targets are used by:

- label cleanup for important product surfaces
- ownership handoff into the current workbench
- availability and design-area hints
- richer inspector properties when a node maps to a known app surface

## Target principles

- target ids should stay readable and stable
- target labels should describe semantic UI regions
- parent/child relations are optional and explicit
- metadata is optional and app-owned

## Target ownership

Target ownership mapping belongs to the app integration layer, not the package.

## Current app targets

Current `apps/web` integration exposes a small semantic target set:

- `app.chrome.topbar`
- `app.timeline.controls`
- `app.timeline.page-switch`
- `app.timeline.filters`
- `app.timeline.canvas`
- `app.timeline.mode-dock`
- `app.tasks.table`
- `app.tasks.timeline`
- `app.designers.timeline`
- `app.designers.surface`
- `app.designers.board`
- `app.task.drawer`
- `app.task.attachments`
- `app.workbench.dock`

## Current ownership shape

Ownership refs are still app-owned and intentionally conservative.

- baseline refs point to existing workbench tabs
- richer refs may also point to app UI-style groups from `uiRegistry`
- package code does not know where those refs came from

## Metadata

Targets may also expose small semantic metadata bags.

- metadata stays app-owned
- typical values describe scope, availability, mode, design area, tuning priority, owner tab, or other host-side facts
- metadata is useful when a target exists in the semantic graph but is not currently mounted in the DOM

Current metadata shape is intentionally lightweight:

- `availability` communicates `live`, `conditional`, `mode-gated`, or `unmounted`
- `designArea` helps group targets for design tuning
- `tuningPriority` helps sort likely-important targets
- `ownerTab` hints which workbench area is usually relevant

## Parent-child rules

Parent-child links stay explicit in the target registry.

- `app.chrome.topbar` -> `app.workbench.dock`
- `app.timeline.controls` -> `app.timeline.page-switch`, `app.timeline.filters`
- `app.timeline.canvas` -> `app.timeline.mode-dock`
- `app.designers.surface` -> `app.designers.board`
- `app.task.drawer` -> `app.task.attachments`

The semantic registry is not the primary inspector tree anymore. It is an enrichment layer over the DOM-derived tree and should stay intentionally small, stable, and product-meaningful.
