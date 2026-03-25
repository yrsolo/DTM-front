# Workbench Authoring Decisions

## Status

Accepted decision pack for the current standalone-product architecture.

## Purpose

This document fixes the main product-seam and execution decisions that should not be re-litigated on each implementation step.

These decisions apply to the future standalone Workbench Authoring product, even while it still lives inside the current monorepo.

## 1. Execution model

- `packages/workbench-source-analysis` stays a library package
- executable entrypoints live in `scripts/*` as thin runners

## 2. Canonical parser scope

Canonical source parsing is limited to:

- local project source
- locally resolvable React components

It excludes canonical parsing of:

- `node_modules`
- third-party internals
- external library component trees

External components may still appear in the graph, but only as opaque nodes/placements.

## 3. Wrapper normalization configurability

- generic built-in normalization rules live in the parser/normalizer
- host-specific overrides are allowed only through declarative adapter configuration

Forbidden:

- ad hoc project-specific parser branches
- DTM-specific if-logic mixed into the generic canonical parser

## 4. Persistence target granularity

Canonical patch targets are only:

- `ComponentDefinitionNode`
- `PlacementNode`

Not patch targets:

- repeated groups
- runtime instances
- DOM nodes
- fiber paths
- projection-only nodes

## 5. Source sync write model

There is no direct write path from runtime interaction to source files.

The only allowed persistence pipeline is:

1. `Parse`
2. `Draft changes`
3. `Consolidate`
4. `Patch proposal`
5. `Apply`

## 6. Inspector vs Authoring ownership

`packages/workbench-inspector` remains the browser/runtime shell package.

It owns:

- overlay
- pick mode
- runtime projection UX
- tree/panel UI
- preview shell behavior

It does not own:

- canonical `SourceGraph`
- canonical source identities
- source normalization policy
- source sync logic

Canonical `SourceGraph` belongs to `packages/workbench-source-analysis`.

## 7. Manual hints policy

Manual hints, labels, boundaries, and ids are allowed only as:

- fallback
- enrichment
- debug support

They must never become a required condition for page coverage.

Hard rule:

> Manual authoring hints cannot be the main scaling strategy for source graph coverage.

## 8. Stable id generation

Stable source ids must be generated only after canonical normalization.

## 9. External node policy

External components may appear as opaque nodes in the graph when useful for navigation or explanation.

But the system must not parse their internals as part of the canonical local source tree unless they are brought under local source ownership.

## 10. Symbol resolution policy

Canonical continuation of the source graph must follow the resolved component symbol, not the file as a whole.

This implies:

- whole-module expansion is forbidden
- barrel/re-export traversal is required
- aliasing does not redefine canonical identity
- wrapper exports are normalized to the underlying symbol by default
- ambiguity falls back to opaque boundaries, not guessed expansion

This sits inside the broader source-continuation subsystem policy.

## 11. Source graph delivery and projection integration

This is treated as a separate subsystem seam with its own accepted bundle:

- snapshot/file-based delivery as the baseline
- explicit freshness
- `SourceNodeId` as the primary source/runtime bridge anchor
- page-scoped or entry-scoped graph loading by default
- browser-owned draft state keyed by stable `SourceNodeId`
- id-based draft reconciliation on refresh/reparse

## 12. Source snapshot and runtime projection binding

This is treated as another separate subsystem seam with its own accepted bundle:

- `SourceNodeId` remains canonical identity
- explicit binding table/layer anchored on source ids
- selection is valid even without runtime projection
- pick mode reverse resolution goes through runtime projection binding
- partial binding coverage is normal
- refresh/rebind happens by source id, not runtime id
- heuristic matching is diagnostics-only, not canonical binding

## 13. Authoring draft application and live preview

This is treated as another separate subsystem seam with its own accepted bundle:

- draft is a separate mutable authoring layer built from `DraftChange`
- preview is computed from canonical source graph + runtime binding/projection + draft + host bridge
- supported scopes are `token`, `component`, `placement`, and optional `instance-preview`
- preview precedence is `token -> component -> placement -> instance-preview`
- refresh reconciliation keeps draft by canonical target ids and marks unmatched entries as explicit non-happy statuses
- generic authoring layer owns draft semantics and reconciliation
- host bridge owns project-specific runtime application
- preview never writes directly to source and never uses DOM mutation as source of truth

## 14. Authoring parameter discovery and preview value mapping

This is treated as another separate subsystem seam with its own accepted bundle:

- editable parameters are normalized into canonical `AuthoringParameterDescriptor[]`
- canonical authoring values use a finite generic value-kind model
- host-specific preview application is handled only through a dedicated host bridge
- effective preview values are resolved per parameter with explicit precedence and source trace
- right-panel editing surface is built from descriptors + effective values + draft changes, not from demo controls or raw host structures

## 15. Scoped host preview application

This is treated as another separate subsystem seam with its own accepted bundle:

- host preview is layered on top of canonical host state, not applied as direct mutation of that state
- host bridge explicitly declares supported scopes for `token`, `component`, `placement`, and `instance-preview`
- placement preview is local and tied to bound runtime projections
- scoped preview targets projections through binding, not guessed DOM matches
- rollback works by removing overlay state and recomputing effective preview state
- unsupported scopes must be surfaced honestly and not emulated by incorrect global side effects

## 16. Authoring parameter semantics and editing constraints

This is treated as another separate subsystem seam with its own accepted bundle:

- parameter constraints live in canonical descriptor semantics
- raw input must pass through canonical parse/validate/coerce flow
- validation/coercion states must stay explicit
- `enum` and `token-ref` remain first-class semantics
- only preview-safe normalized values may cross into the host preview bridge
- editor selection is driven by descriptors + constraints + validation state, not ad hoc widget logic

## Package seam

### `packages/workbench-source-analysis`

Node-side engine for:

- AST/source parsing
- TypeScript/module resolution
- placement normalization
- canonical source identities
- canonical `SourceGraph`

### `packages/workbench-inspector`

Browser/runtime shell for:

- overlay
- pick mode
- runtime projection
- tree/panel UI
- preview shell
- source graph consumption

### `packages/workbench-contracts`

Shared contracts only:

- ids
- `SourceNode`
- `RuntimeProjection`
- `AuthoringNode`
- `AuthoringValue`
- `SourceSyncPatch`
- related shared types

## Reading order

Read this together with:

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_SOURCE_IDENTITY_STRATEGY.md](WORKBENCH_SOURCE_IDENTITY_STRATEGY.md)
- [PLACEMENT_NORMALIZATION_POLICY.md](PLACEMENT_NORMALIZATION_POLICY.md)
- [SOURCE_CONTINUATION_POLICY.md](SOURCE_CONTINUATION_POLICY.md)
- [SYMBOL_RESOLUTION_POLICY.md](SYMBOL_RESOLUTION_POLICY.md)
- [SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md](SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md)
- [SOURCE_RUNTIME_BINDING_POLICY.md](SOURCE_RUNTIME_BINDING_POLICY.md)
- [AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md](AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md)
- [AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md](AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md)
- [SCOPED_HOST_PREVIEW_APPLICATION.md](SCOPED_HOST_PREVIEW_APPLICATION.md)
- [AUTHORING_PARAMETER_SEMANTICS_AND_EDITING_CONSTRAINTS.md](AUTHORING_PARAMETER_SEMANTICS_AND_EDITING_CONSTRAINTS.md)
