# Source Runtime Binding Policy

## Status

Accepted unified policy for `Source Snapshot <-> Runtime Projection Binding`.

## Purpose

This document defines the binding subsystem between:

- canonical source-graph snapshots
- runtime projections
- browser selection/highlight behavior
- pick-mode reverse resolution
- refresh/rebind behavior

After this bundle is accepted, implementation should not stop separately on:

- selection behavior
- pick mode reverse mapping
- unresolved source nodes
- partial binding coverage
- refresh/rebind semantics

These are one subsystem seam: `Source Snapshot <-> Runtime Projection Binding`.

## Core principle

`SourceNodeId` remains the canonical identity.

Runtime projection is always secondary and only binds onto source ids.

## Canonical rules

### 1. Primary identity is `SourceNodeId`

Canonical identity in the browser remains the source id from the snapshot.

Runtime ids do not replace or redefine that identity.

### 2. Binding layer is explicit

Binding must be represented by an explicit binding layer or binding table.

The binding anchor is `SourceNodeId`.

Allowed cardinality:

- one source node -> zero projections
- one source node -> one projection
- one source node -> many projections

### 3. Selection is source-first

Tree selection and authoring selection are valid at the source level even if no runtime projection exists.

If a projection is bound:

- use it for highlight
- use it for reveal on page

If no projection is bound:

- keep selection valid as a source selection
- do not fake a runtime target

### 4. Pick mode resolves through projection binding

Reverse resolution must follow this path:

`runtime element -> runtime projection -> bound SourceNodeId`

If canonical binding is missing:

- runtime/debug fallback is allowed
- guessed source matches are not allowed as canonical behavior

### 5. Partial binding is normal

Binding coverage may be partial and this must not break the source tree.

Required statuses:

- `bound`
- `multiple`
- `unresolved`
- `stale`

### 6. Refresh rebuilds binding, not identity

After a new snapshot or a new runtime scan:

- rebuild binding table
- keep source identity based on stable `SourceNodeId`
- rebind selection, marks, and draft state by source id

Runtime ids are not the primary rebinding key.

### 7. No heuristic-first canonical matching

Labels, paths, tree similarity, and similar heuristics may be used only for:

- diagnostics
- debug UI
- fallback hints

They must not become the primary canonical binding strategy.

## UI implications

### Source tree

The source tree remains authoritative even when runtime coverage is incomplete.

### Highlight/reveal

Highlight and reveal are available only when the binding layer resolves a projection.

### Pick mode

Pick mode is allowed to land on runtime-only/debug selections when no canonical binding exists, but that must be visually distinguishable from canonical source-bound selection.

### Unresolved nodes

Unresolved source nodes must remain visible and selectable in the tree.

They should be explained through binding status instead of disappearing.

## Refresh and reconciliation

When source snapshot changes:

- keep browser state keyed by `SourceNodeId`
- rebuild bindings against the new snapshot and latest runtime projections
- mark stale or unresolved bindings explicitly when projection coverage changes

When runtime scan changes:

- rebuild projection bindings
- preserve source selection and browser draft state by source id

## Reading order

Read this together with:

- [SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md](SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
