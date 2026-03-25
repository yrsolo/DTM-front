# Workbench Authoring Vision

## Status

Active target architecture for the future standalone authoring product.

## Core intent

Workbench Authoring is not just a runtime inspector. It is a code-first authoring product that:

- parses React/source structure into a primary `SourceGraph`
- lets a developer inspect and tune the page through a live shell
- keeps edits in a draft/authoring layer during exploration
- persists approved changes back into source code as an explicit step

Canonical journey:

`Parse -> Enrich -> Inspect -> Tune -> Consolidate -> Persist`

## Product boundaries

The product must be extractable from this repository later with minimal changes.

- current repo is only the first host implementation
- inspector shell is a delivery layer, not the product core
- product core must stay free of DTM-specific domain assumptions
- host-specific logic must be injected through adapters and optional enrichment

The result of authoring must live in source code without requiring inspector runtime.

Canonical persistence identity is defined by source analysis, not by runtime traversal.

## Package seam

The product is now split conceptually into three packages:

- `packages/workbench-source-analysis`
  Node-side engine for AST/source parsing, TypeScript/module resolution, placement normalization, canonical source identities, and canonical `SourceGraph`.
- `packages/workbench-inspector`
  Browser/runtime shell for overlay, pick mode, runtime projection, tree/panel UI, and preview-facing interaction.
- `packages/workbench-contracts`
  Shared contracts only: ids, `SourceNode`, `SourceGraph`-adjacent models, `RuntimeProjection`, `AuthoringNode`, and related cross-package types.

Hard rule:

> Canonical `SourceGraph` lives in `workbench-source-analysis`, not in `workbench-inspector`.

Execution model rule:

- `workbench-source-analysis` stays a library package
- executable repo entrypoints live in `scripts/*` as thin runners

## Automatic coverage rule

Coverage strategy is fixed in this order:

1. automatic source graph extraction from React/component structure
2. minimal instrumentation when automatic extraction needs technical support
3. manual ids, labels, and hints only as fallback for ambiguous or hard-to-map nodes

Hard rule:

> Page-by-page manual tree authoring must never become the main scaling strategy.

Additional accepted decisions are fixed in [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md).

## Primary models

- `SourceNode`: node of the parsed source/component structure
- `AuthoringNode`: authoring-facing view of a source node with editable surfaces and scopes
- `AuthoringParameterDescriptor`: canonical description of one editable parameter exposed by the authoring layer
- `RuntimeProjection`: runtime/rendered projection used for pick mode, highlight, and verification
- `AuthoringDraft`: temporary edits used by live preview
- `ConsolidationDecision`: decision about token/component/instance scope before persistence
- `SourceSyncPatch`: explicit patch proposal for source files

Not every `SourceNode` must immediately become a rich `AuthoringNode`.

## Canonical persistence targets

The product must not treat every repeated runtime instance as a persistence target.

Primary persistence targets:

- `ComponentDefinitionNode`
- `PlacementNode`

Secondary runtime explanation layer:

- `RepeatedProjectionGroup`

### ComponentDefinitionNode

Represents the reusable component itself and its shared defaults.

This level is for changes that should affect all usages unless a more specific placement override exists.

### PlacementNode

Represents a specific usage of a component in a specific source context.

This is the main unit for local contextual tuning.

Examples:

- `SettingsModal.footer.saveButton`
- `TaskDrawer.header.closeButton`
- `TimelineToolbar.filters.applyButton`

### RepeatedProjectionGroup

Represents repeated runtime projections of the same source template or placement.

This exists mainly for:

- runtime selection
- preview
- explanation
- grouping
- resolution from a clicked repeated instance back to the shared source target

It is not the normal persistence target.

When the user clicks a repeated runtime item, the system should usually resolve that click to the shared placement/template and apply editing there.

## System phases

### Parse

Automatically extract the source graph from React/source structure.

The parse stage should produce source-level structures such as component definitions, placements, and repeated projection groups when possible.

### Enrich

Add labels, slots, editability hints, grouping hints, and optional host metadata.

### Inspect

Show the source tree as primary navigation and runtime projections as secondary verification.

### Tune

Apply edits in a draft layer and reflect them in live preview without writing to source files.

Live preview is computed from:

- canonical source graph snapshot
- runtime projection/binding layer
- authoring draft changes
- host-specific preview bridge

Preview scopes are ordered as:

`token -> component -> placement -> instance-preview`

`instance-preview` is optional and temporary. It must not become the default persistence path.

Host preview must remain layered:

- canonical host state is the base
- temporary preview is an overlay
- placement preview is local to bound runtime projections, not a fake global overwrite

The right panel must be driven by canonical authoring parameter descriptors and effective preview values, not by raw host control structures.

Parameter editing semantics must also stay canonical:

- constraints live in descriptors
- raw input passes through parse/validate/coerce before preview
- enum and token-ref values stay first-class
- only preview-safe normalized values cross into the host bridge

### Consolidate

Decide whether a change becomes a token, component default, or instance override.

### Persist

Generate and review explicit source patches that can live without the authoring runtime.

Persistence should target component definitions and placements. It should not assume per-instance source persistence for arbitrary repeated loop items.

## Non-goals

Workbench Authoring must not become:

- a page builder
- a DOM editor
- a second permanent runtime source of truth
- a production-exposed editing tool
- a host-specific integration framework disguised as a generic product

## Relationship to current inspector

Current `Workbench Inspector` work remains valuable groundwork:

- launcher and shell
- tree UI
- pick mode and highlight
- focus workflow
- host enrichment seam

But it is now considered a shell layer around the future authoring product, not the final architecture.

See also: [WORKBENCH_SOURCE_IDENTITY_STRATEGY.md](WORKBENCH_SOURCE_IDENTITY_STRATEGY.md)
See also: [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
See also: [SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md](SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md)
See also: [SOURCE_RUNTIME_BINDING_POLICY.md](SOURCE_RUNTIME_BINDING_POLICY.md)
See also: [AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md](AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md)
See also: [AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md](AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md)
See also: [SCOPED_HOST_PREVIEW_APPLICATION.md](SCOPED_HOST_PREVIEW_APPLICATION.md)
See also: [AUTHORING_PARAMETER_SEMANTICS_AND_EDITING_CONSTRAINTS.md](AUTHORING_PARAMETER_SEMANTICS_AND_EDITING_CONSTRAINTS.md)

Normalization of raw parser output into canonical persistence targets is governed by [PLACEMENT_NORMALIZATION_POLICY.md](PLACEMENT_NORMALIZATION_POLICY.md).
