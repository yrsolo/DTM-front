# Authoring Draft Application And Preview

## Status

Accepted subsystem policy for `Authoring Draft Application & Live Preview`.

## Purpose

This document fixes the canonical rules for how mutable authoring draft state is represented, applied to the live shell, and reconciled after snapshot or runtime refresh.

It closes the whole preview seam as one policy bundle so implementation does not need to stop separately on:

- draft data model
- preview application contract
- preview scopes
- refresh reconciliation
- host bridge ownership
- precedence rules

## 1. Draft model

Draft changes are a separate mutable authoring layer.

Canonical unit:

- `DraftChange`

Hard rules:

- draft is not a clone of the full source graph
- draft is not a bag of DOM mutations
- draft does not redefine canonical source identity
- draft is keyed by stable canonical target ids such as `SourceNodeId`

The draft layer exists only to express temporary authoring intent before consolidation and persistence.

## 2. Preview application contract

Live preview is computed from four inputs:

1. canonical source graph snapshot
2. runtime binding/projection layer
3. draft changes
4. host-specific preview bridge

Hard rules:

- preview never writes directly to source files
- preview never treats DOM mutation as source of truth
- runtime projection is an application surface, not a canonical model
- host project systems may apply the computed preview through controls, CSS variables, recipes, or other runtime mechanisms, but canonical draft ownership stays above that layer

## 3. Preview target scopes

Supported preview scopes:

- `token`
- `component`
- `placement`
- optional `instance-preview`

Meaning:

- `token`: shared design value or token-level draft
- `component`: shared component-default preview
- `placement`: contextual usage-site preview
- `instance-preview`: temporary per-projection preview when needed for UX or debugging

Hard rules:

- canonical persistent path remains `token / component / placement`
- `instance-preview` is optional and temporary
- `instance-preview` must not become the default persistence escape hatch

## 4. Preview precedence

Preview must apply scopes in this order:

1. `token`
2. `component`
3. `placement`
4. `instance-preview`

This means:

- broader shared values resolve first
- more local scopes override broader scopes in preview
- `instance-preview` is last and only for temporary projection-level behavior

## 5. Refresh reconciliation

Draft changes survive refresh by stable canonical target ids.

After snapshot refresh, runtime rebind, or both:

- matched draft entries remain active
- unmatched entries must become explicit statuses such as:
  - `stale`
  - `unresolved`
  - `invalid`

Hard rule:

> Draft changes must not be silently dropped during refresh or reparse.

Refresh reconciliation happens by canonical ids, not by runtime ids or DOM order.

## 6. Host bridge ownership

Generic authoring preview layer owns:

- draft model
- scope semantics
- preview computation
- draft reconciliation
- precedence rules

Host bridge owns:

- project-specific runtime application
- mapping preview values into controls, CSS vars, recipes, or host runtime systems
- project-specific preview affordances when needed

Hard rule:

- generic authoring layer must not absorb host-specific control logic as product core behavior

## 7. Safety rules

- no direct source writes from preview
- no runtime-only ids as canonical draft identity
- no DOM mutation bag as preview persistence model
- no heuristic-first source targeting
- no silent downgrade from `component` or `placement` scope into `instance-preview`

If preview cannot be applied reliably through the host bridge, the draft remains valid as authoring state even if the live projection becomes partial or unresolved.

## 8. UI implications

The browser shell should reflect that preview is source-first:

- selected source node remains valid even without active runtime projection
- draft status must be visible when useful
- unresolved or stale draft entries are normal states, not fatal errors
- preview failures should surface as binding/application state, not as loss of authoring intent

## 9. Relationship to other policies

Read this together with:

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md](SOURCE_GRAPH_DELIVERY_AND_PROJECTION.md)
- [SOURCE_RUNTIME_BINDING_POLICY.md](SOURCE_RUNTIME_BINDING_POLICY.md)

This policy assumes:

- canonical source graph comes from `workbench-source-analysis`
- browser shell consumes snapshots and runtime projections
- runtime projection is secondary to canonical source identity
