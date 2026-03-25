# Source Continuation Policy

## Status

Accepted unified policy for canonical source continuation in Workbench Authoring.

## Purpose

This document defines the whole source-continuation subsystem as one policy bundle.

After this policy is accepted, implementation should not stop separately on:

- barrel completeness
- default and alias identity
- wrapper normalization
- ambiguity fallback
- cycle handling
- graph dedup

These are all part of one unified layer: canonical source continuation.

## Core principle

Canonical source continuation must be based on TypeScript symbol resolution, not only on AST plus import text.

The continuation unit is the resolved component symbol, not the file.

## Canonical rules

### 1. Continuation unit = resolved symbol, not file

Canonical graph continuation follows a concrete resolved symbol.

Files are only containers and traversal waypoints.

### 2. TypeScript checker is required

Canonical continuation requires TypeScript-level symbol resolution.

AST-only import parsing may be used for bootstrap or fallback, but it is not sufficient as the final continuation basis.

### 3. Barrel and re-export traversal is symbol-based and transitive

Barrels and re-exports must be traversed by following symbols through the export chain until one of these happens:

- canonical source definition is resolved
- continuation becomes ambiguous
- continuation exits supported local source scope

### 4. Default export and alias identity resolve to the underlying canonical symbol

Local aliases and import syntax do not redefine canonical identity.

Examples:

- `import Foo from "./x"`
- `import { Foo as Bar } from "./x"`
- `export { Foo as Bar } from "./x"`

All must resolve to the same underlying canonical symbol when semantically appropriate.

### 5. Technical wrappers normalize to the underlying component by default

Default normalization target:

- `memo(Component)` -> `Component`
- `forwardRef(Component)` -> `Component`
- `observer(Component)` -> `Component`
- similar technical HOC wrappers -> underlying component

### 6. Authoring-meaningful wrappers may remain separate definitions only by policy

A wrapper may remain a distinct canonical definition only when policy explicitly says it carries independent authoring meaning.

This must be a policy decision, not a parser accident.

### 7. Ambiguity creates an opaque boundary

If resolution is ambiguous or not reliable enough, create an opaque continuation boundary.

Preferred fallback:

- stop expansion
- keep a stable opaque node
- record the unresolved state

### 8. Never over-expand when uncertain

When the analyzer is unsure, it must not:

- expand the whole module
- guess the target export from filename only
- unfold unrelated exports “just in case”

### 9. Definition nodes deduplicate by canonical symbol identity

`ComponentDefinitionNode` instances deduplicate by resolved canonical symbol identity, not by:

- file path alone
- local alias name
- raw import text

### 10. Cycles must be handled by visited-symbol and canonical-id dedup rules

Cycle safety must be implemented at the symbol level.

Visited-file alone is not sufficient because the same file may legitimately host multiple distinct canonical symbols.

### 11. Placement nodes remain usage-site specific

`PlacementNode` remains a usage-site node.

It must not collapse into definition identity just because continuation resolves to the same underlying component symbol.

### 12. External and third-party internals stay opaque by default

External or third-party components may appear as opaque nodes or placements.

Their internals stay outside the canonical local source graph unless explicitly supported by policy.

## Id generation implications

Canonical ids must be generated only after:

1. symbol resolution
2. wrapper normalization
3. placement normalization
4. canonical dedup

This applies to both:

- `ComponentDefinitionNode`
- `PlacementNode`

## Subsystem consequences

The source-continuation layer now includes, by definition:

- import binding resolution
- export and re-export traversal
- symbol identity normalization
- wrapper normalization
- ambiguity fallback
- cycle handling
- canonical dedup

This means new blockers inside this same layer should not be surfaced as separate policy seams unless they genuinely introduce a different subsystem boundary.

## Relationship to other docs

This is the umbrella policy for continuation.

Supporting documents:

- [WORKBENCH_SOURCE_IDENTITY_STRATEGY.md](WORKBENCH_SOURCE_IDENTITY_STRATEGY.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [PLACEMENT_NORMALIZATION_POLICY.md](PLACEMENT_NORMALIZATION_POLICY.md)
- [SYMBOL_RESOLUTION_POLICY.md](SYMBOL_RESOLUTION_POLICY.md)
