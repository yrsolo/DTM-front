# Workbench Source Identity Strategy

## Status

Accepted architectural decision.

## Decision

Workbench Authoring uses a hybrid architecture.

### Canonical identity for `Persist`

Canonical identity must come from source analysis, not from runtime traversal.

It must not be based on:

- runtime path or index
- DOM order
- fiber traversal order
- runtime-only `sourceLocation`

### Runtime role

Runtime, fiber, and DOM remain important, but only as a projection layer for:

- pick mode
- highlight
- reveal on page
- live preview
- runtime verification
- projection mapping

## Persistence targets

Primary persistence targets:

- `ComponentDefinitionNode`
- `PlacementNode`

Repeated runtime instances are not primary persistence targets.

They must normally resolve to shared source-level targets.

## Required model split

The system must distinguish:

### `ComponentDefinitionNode`

Represents the reusable component definition and its shared defaults.

### `PlacementNode`

Represents a specific usage of a component in a specific source context.

This is the main unit for local contextual tuning.

### `RepeatedProjectionGroup`

Represents repeated runtime projections of the same source template or placement.

This exists for:

- runtime selection
- preview
- explanation
- grouping
- resolution back to a shared source target

It is not the normal persistence target.

## Strategy

### Source-analysis-first

The next implementation priority is a source-analysis-first slice.

Package boundary for that slice:

- `packages/workbench-source-analysis` owns canonical source parsing and normalization
- `packages/workbench-inspector` only consumes source identities and runtime projections
- `packages/workbench-contracts` carries shared ids and graph contracts

Execution model:

- `workbench-source-analysis` is a library package
- executable entrypoints remain in `scripts/*`

It must define canonical identity for:

- `ComponentDefinitionNode`
- `PlacementNode`

It must also define:

- AST/source parser strategy
- whether compile-time transform is needed and where
- mapping from source identities to runtime projections
- canonical normalization policy for raw parser output
- canonical symbol resolution policy for import/export continuation
- unified source continuation policy for checker-based canonical traversal

### Mapping model

Required mapping direction:

- `SourceNodeId -> RuntimeProjection(s)`
- `Pick on page -> RuntimeProjection -> SourceNodeId`

## Manual hints rule

Manual hints, labels, and boundaries are allowed only as:

- fallback
- enrichment
- debug support

They must not become the main coverage strategy.

External component policy:

- external and third-party components may appear as opaque nodes
- their internals must not become part of the canonical local source tree

## Consequence for current implementation

Current runtime/fiber parsing remains useful as:

- bootstrap
- projection layer
- fallback
- debug layer

But it must not be extended as the canonical identity basis for source persistence.

See also: [PLACEMENT_NORMALIZATION_POLICY.md](PLACEMENT_NORMALIZATION_POLICY.md)
See also: [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
See also: [SOURCE_CONTINUATION_POLICY.md](SOURCE_CONTINUATION_POLICY.md)
See also: [SYMBOL_RESOLUTION_POLICY.md](SYMBOL_RESOLUTION_POLICY.md)
