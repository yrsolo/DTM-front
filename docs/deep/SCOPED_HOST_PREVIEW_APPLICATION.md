# Scoped Host Preview Application

## Status

Accepted subsystem policy for `Scoped Host Preview Application`.

## Purpose

This document fixes the canonical rules for how the host runtime applies preview values locally and reversibly without mutating canonical host state directly.

It closes the seam as one policy bundle so implementation does not need to stop separately on:

- scoped channels
- placement-local application
- projection targeting
- host state layering
- rollback
- capability reporting

## 1. Host preview must be layered

Current host global state such as `design` and `keyColors` is only the base layer.

Preview must use an additional overlay layer.

Hard rules:

- temporary preview is not a direct mutation of canonical host state
- preview state must be recomputed from base state plus overlay state
- removing preview must not require manual restoration of previous values

## 2. Scoped preview channels

Host preview architecture must distinguish channels for:

- `token`
- `component`
- `placement`
- `instance-preview`

Hard rules:

- host bridge must explicitly declare which scopes it truly supports
- generic authoring layer may request any supported scope
- unsupported scopes must be surfaced honestly

## 3. Placement preview is local, not global

Placement-scoped preview must not be implemented by globally overwriting `design` or `keyColors`.

It requires a local preview overlay tied to:

- `SourceNodeId`
- `PlacementNode`
- bound runtime projection(s)

Hard rules:

- placement preview applies only to the corresponding runtime projection(s)
- global host values remain base inputs
- local preview must not leak into unrelated surfaces

## 4. Projection targeting

Scoped preview must be applied through runtime projection binding.

Hard rules:

- no guessed DOM matches
- no label-based targeting as canonical behavior
- no fake local preview implemented through global state mutation

The bridge target path is:

`SourceNodeId -> binding table -> runtime projection(s) -> host-local preview application`

## 5. Rollback semantics

Preview rollback must work by removing overlay state and recomputing effective preview state.

Hard rules:

- no manual restoration of remembered previous values
- no imperative “undo this CSS mutation” as canonical model
- recomputation from base + overlays is the source of truth

## 6. Capability-aware host bridge

The generic authoring system may request:

- `token`
- `component`
- `placement`
- `instance-preview`

The host bridge must explicitly report:

- supported scopes
- unsupported scopes
- partially supported scopes when needed

Hard rule:

- unsupported scopes must not be emulated through incorrect global side effects

## 7. Host state layering model

Canonical host preview layering is:

1. base host state
2. token overlay
3. component overlay
4. placement overlay
5. instance-preview overlay

This mirrors effective value precedence while keeping temporary preview separate from canonical host state.

## 8. Phased host evolution

Allowed phased evolution:

1. support global/token-like preview first
2. add explicit capability reporting
3. add local placement overlays through runtime projection binding
4. add optional `instance-preview` for debugging or temporary UX

Hard rule:

- each phase must truthfully report capability level
- earlier phases must not pretend to support placement-local preview if they only support global changes

## 9. Safety rules

- no direct mutation of canonical host state as preview truth
- no guessed local preview targeting
- no global overwrite masquerading as placement preview
- no rollback based on manual restoration bookkeeping
- no implicit scope support

## 10. Relationship to other policies

Read this together with:

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md](AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md)
- [AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md](AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md)
- [SOURCE_RUNTIME_BINDING_POLICY.md](SOURCE_RUNTIME_BINDING_POLICY.md)

This policy assumes:

- canonical source ids already exist
- binding table already exists
- preview values are already resolved generically before host application
