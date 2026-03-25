# Symbol Resolution Policy

## Status

Accepted canonical policy for source-graph symbol traversal.

## Purpose

This document defines how source analysis must continue the graph across imports, exports, aliases, barrels, and wrapper exports.

It exists to prevent a silent fallback from symbol-level identity to file-level expansion.

## Core principle

Canonical continuation of the source graph must follow the resolved component symbol, not the file as a whole.

A file is not by itself a continuation unit.

The continuation unit is the concrete imported/exported symbol that represents the authoring-meaningful component target.

## Canonical rules

### 1. Continuation unit = symbol, not file

If a source node references a component import, graph continuation must proceed only through the specific referenced symbol.

Forbidden behavior:

- expanding the whole source file just because one symbol came from it
- treating a module as the canonical continuation target by default

### 2. Whole-module expansion is forbidden

If one symbol is imported from a module, source analysis must not unfold unrelated exports from that module into the same continuation branch.

This applies to:

- direct imports
- named re-exports
- barrel modules
- default export forwarding

### 3. Re-export and barrel traversal is required

Barrel files and re-exports must be traversed transitively until the underlying source definition is resolved or resolution becomes ambiguous.

Barrel modules are not canonical component definitions by default.

They are routing layers for symbol resolution, not primary authoring targets.

### 4. Aliasing is preserved locally but canonical identity points to the original symbol

Local aliasing may change the local display name or import syntax, but it must not redefine canonical component identity.

Example:

```ts
import { PrimaryButton as SaveButton } from "./buttons";
```

Local usage name:

- `SaveButton`

Canonical source-definition target:

- original resolved symbol for `PrimaryButton`

### 5. Wrapper exports are normalized

Exports wrapped in common runtime helpers must normally collapse to the underlying component symbol.

Examples:

- `memo(Component)`
- `forwardRef(Component)`
- `observer(Component)`
- similar HOC-style wrappers

They become separate canonical definitions only when they carry independent authoring meaning.

Default rule:

- wrapper export = technical continuation layer
- underlying component = canonical definition target

### 6. Ambiguity fallback prefers opaque boundaries

If symbol resolution is not reliable enough, the parser must stop at an opaque symbol boundary instead of expanding the wrong target.

Preferred fallback:

- keep a stable opaque node
- record that continuation is unresolved or external

Forbidden fallback:

- expand the whole module “just in case”
- guess a random export based on filename only

## Traversal model

Recommended traversal stages:

1. resolve local import binding
2. resolve imported/exported symbol
3. traverse through re-export/barrel chain if needed
4. normalize wrapper exports
5. stop at canonical source definition or opaque boundary

## Id generation implications

Canonical ids must be generated only after:

- symbol resolution
- wrapper normalization
- placement normalization

This means:

- local alias names are not enough for canonical id generation
- module filenames alone are not enough
- raw import specifiers are not enough

Canonical `ComponentDefinitionNode` identity should reflect the resolved original definition symbol after normalization.

Canonical `PlacementNode` identity should reflect normalized ancestry plus the resolved target symbol.

## Examples

### Example A: direct import

```ts
import { FiltersBar } from "../components/FiltersBar";
```

Canonical continuation:

- symbol `FiltersBar`

Not:

- whole `FiltersBar.tsx` module

### Example B: barrel re-export

```ts
import { FiltersBar } from "../components";
```

and:

```ts
export { FiltersBar } from "./FiltersBar";
```

Canonical continuation:

- traverse barrel export
- resolve to original `FiltersBar` definition

### Example C: alias import

```ts
import { FiltersBar as TimelineFilters } from "../components/FiltersBar";
```

Local label:

- `TimelineFilters`

Canonical definition target:

- `FiltersBar`

### Example D: wrapper export

```ts
export default memo(FiltersBar);
```

Default canonical target:

- `FiltersBar`

Not:

- `memo(FiltersBar)` as separate definition

### Example E: ambiguous module

If symbol resolution cannot safely determine which exported component is the canonical continuation target:

- keep opaque symbol boundary
- do not unfold the entire module

## Consequence for current implementation

Current source-analysis implementation must move from file-following to symbol-following continuation.

Local file traversal is useful only when it is guided by the imported/exported symbol identity.

See also:

- [WORKBENCH_SOURCE_IDENTITY_STRATEGY.md](WORKBENCH_SOURCE_IDENTITY_STRATEGY.md)
- [PLACEMENT_NORMALIZATION_POLICY.md](PLACEMENT_NORMALIZATION_POLICY.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
