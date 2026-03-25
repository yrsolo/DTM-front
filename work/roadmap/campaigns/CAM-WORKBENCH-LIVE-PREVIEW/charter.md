# CAM-WORKBENCH-LIVE-PREVIEW

## Objective

Apply authoring draft changes to the live UI in real time without writing to source files directly.

## In scope

- draft layer only
- preview application model
- shell usage of source tree plus runtime projection
- explicit separation from source writes
- browser-owned draft state keyed by stable `SourceNodeId`
- refresh reconciliation against new source-graph snapshots

## Additional rules

- canonical source graph is delivered as snapshot/artifact in the baseline model
- freshness is explicit via manual refresh or optional watch rebuild
- runtime projection is secondary and binds onto stable source ids
- source/runtime binding statuses must not break source-first selection and draft ownership
- draft changes are a separate mutable authoring layer, not a cloned graph and not a DOM mutation bag
- preview is computed from source snapshot + runtime binding/projection + draft + host-specific preview bridge
- preview scopes apply in order: `token -> component -> placement -> instance-preview`
- refresh reconciliation must preserve draft by canonical target ids and mark unmatched entries explicitly instead of dropping them
- generic authoring layer owns draft semantics and reconciliation; host bridge owns project-specific runtime application
- editable preview inputs must come from canonical parameter descriptors and effective values, not from raw host controls
- host preview must be layered over base host state, with explicit capability reporting for supported scopes
- placement preview must be local to bound runtime projections and must not be emulated by global overwrites
- parameter constraints and editor choice must stay descriptor-driven, with canonical parse/validate/coerce before any host preview application

## Out of scope

- patch generation
- apply-to-source workflow
