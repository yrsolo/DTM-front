# Workbench Inspector Structure

## Package structure

`packages/workbench-inspector/src/` is organized into:

- `contracts/` for public-facing generic types
- `model/` for internal state model helpers
- `runtime/` for provider/context wiring
- `core/` for public hooks
- `overlay/` for overlay primitives
- `panels/` for sidebar/panel primitives
- `ui/` for future generic UI pieces
- `utils/` for neutral helper utilities
- `types/` for type re-exports

Only `public.ts` is a public entrypoint.

For current runtime behavior and user-visible modes, see [WORKBENCH_INSPECTOR_TECHNICAL.md](WORKBENCH_INSPECTOR_TECHNICAL.md). For the future product-center architecture, see [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md). This page focuses on the current shell structure and ownership.

## Package model boundaries

- `InspectorNode` is the primary package model and is derived from runtime React ownership, not from DOM traversal
- semantic target data is optional enrichment attached to a node when the host integration can provide it
- `InspectorState` now includes package-owned shell and hierarchy state:
  - expanded node ids
  - marked node ids
  - query
  - focus mode (`all`, `marked`)
  - pick mode (`off`, `on`)
  - tree filter mode (`smart`, `all`)
  - shell open state and position
- local persistence for hierarchy/focus state is package-local and dev-only
- host metadata such as `availability`, `scope`, `designArea`, `ownerTab`, and `tuningPriority` stays in the app registry
- DOM survives only as anchor/mapping information for highlight and pick mode
- this runtime node model is current shell groundwork, not the future primary product model

## App structure

`apps/web/src/inspector-integration/` contains only host-side glue:

- `activation.ts`
- `targetRegistry.ts`
- `targetBindings.ts`
- `openWorkbench.ts`
- `workbenchOwnership.ts`
- `index.ts`

The rest of the app should treat this folder as the single entry to inspector integration.

## Navigation model

- canvas overlay is a discovery surface driven primarily by explicit `Pick mode`
- `Alt+Click` may remain as a secondary shortcut, but page interception is owned by the package
- hierarchy tree is the primary navigation surface and is rendered through `react-arborist`
- expand/collapse is independent from target selection
- focus set is a package-level filter for design-tuning sessions, not a host-owned editor state
- inspector shell is always summonable in dev mode through a floating launcher
- the launcher and expanded panel share one draggable position model
- the shell can collapse into a narrow draggable button and expand back without losing hierarchy state
- hovering a tree row highlights the corresponding page element
- the right panel mixes universal node properties with optional host-provided semantic and workbench sections
- repeated click on an already selected expandable row toggles that branch

## Transition note

The current shell structure should not be mistaken for the final authoring-product architecture.

- future primary tree: `SourceGraph`
- current runtime tree: delivery-shell groundwork
- current app integration: first host implementation, not permanent product coupling
