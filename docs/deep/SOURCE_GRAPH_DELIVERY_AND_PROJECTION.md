# Source Graph Delivery And Projection

## Status

Accepted unified policy for source-graph delivery and runtime projection integration.

## Purpose

This document defines the whole integration layer between:

- node-side canonical source analysis
- browser/runtime authoring shell
- runtime projection mapping
- draft ownership in the browser

After this bundle is accepted, implementation should not stop separately on:

- delivery model
- freshness model
- source-to-runtime bridge shape
- graph loading strategy
- draft ownership and refresh reconciliation

These are one subsystem seam: `Source Graph Delivery & Projection Integration`.

## Core principle

Canonical `SourceGraph` is node-side and read-only in the browser.

The browser shell consumes a delivered snapshot/artifact of the graph and binds runtime projections onto stable `SourceNodeId`s.

## Canonical rules

### 1. Delivery model starts with snapshot/file-based delivery

First version delivery model:

- canonical `SourceGraph` is delivered to the browser as a generated artifact or snapshot
- snapshot delivery is the default base

Not required for v1 foundation:

- live endpoint
- websocket bridge
- persistent dev daemon

These may come later, but they are not required to define the baseline architecture.

### 2. Freshness is explicit, not magical

Source graph freshness must be explicit.

The browser shell does not assume the graph is self-updating.

Allowed freshness actions:

- manual refresh
- optional watch rebuild
- explicit snapshot replacement

When a new snapshot arrives, the browser shell treats it as a new canonical source-graph version.

### 3. `SourceNodeId` is the primary bridge anchor

The primary bridge anchor is `SourceNodeId`.

Runtime projection is secondary and refers to source ids.

The browser shell must not reconstruct this bridge by guessing from runtime tree shape alone.

Required bridge idea:

- source graph owns `SourceNodeId`
- runtime projection points to `SourceNodeId`
- browser UI state attaches to `SourceNodeId`

### 4. Loading starts with page-scoped or entry-scoped slices

Do not load the whole project graph by default.

Initial loading strategy:

- page-scoped slice
- route-scoped slice
- entry-scoped slice

Whole-project loading is not the baseline.

### 5. Draft ownership belongs to the browser shell

Canonical source graph remains node-side and read-only inside the browser.

Draft authoring state lives in the browser shell.

Draft changes are keyed by stable `SourceNodeId`.

This means:

- source analysis owns canonical graph generation
- browser shell owns transient editing state
- browser shell never mutates canonical graph identity directly

### 6. Refresh reconciliation is id-based

When a refreshed or rebuilt source-graph snapshot arrives:

- browser shell tries to rebind draft state by `SourceNodeId`
- draft logic is preserved when ids still resolve
- stale draft entries may be marked unresolved if ids disappear

The shell must not rebuild draft logic from runtime-only assumptions after refresh.

### 7. Runtime projection remains secondary

Runtime projection exists for:

- pick mode
- highlight
- reveal on page
- preview verification
- source-to-runtime inspection alignment

It is not the owner of canonical source identity.

### 8. Delivery and preview are separate concerns

Source-graph delivery and runtime preview may interact, but they are not the same subsystem.

Canonical graph transport must stay conceptually separate from:

- live preview rendering
- draft application logic
- source sync

## Recommended baseline flow

1. node-side analysis builds canonical page-scoped `SourceGraph`
2. graph is written or exposed as a snapshot/artifact
3. browser shell loads that snapshot
4. browser shell binds runtime projections to `SourceNodeId`
5. browser shell stores draft state keyed by `SourceNodeId`
6. explicit refresh replaces snapshot and triggers id-based draft reconciliation

## Consequences

### For `workbench-source-analysis`

- owns canonical source graph generation
- owns snapshot/artifact shape for delivery
- remains node-side

### For `workbench-inspector`

- consumes delivered graph snapshots
- owns runtime projection UI and browser draft state
- must not become the owner of canonical graph generation

### For future transport

If a richer dev bridge appears later, it should still satisfy the same rules:

- explicit freshness
- source-graph snapshot semantics
- `SourceNodeId` as primary anchor

## Reading order

Read this together with:

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [WORKBENCH_SOURCE_IDENTITY_STRATEGY.md](WORKBENCH_SOURCE_IDENTITY_STRATEGY.md)
- [SOURCE_CONTINUATION_POLICY.md](SOURCE_CONTINUATION_POLICY.md)
