# Placement Normalization Policy

## Status

Accepted normalization policy for source-analysis-first parsing.

## Purpose

This document defines how raw React/JSX/source-analysis output is normalized into canonical source-level authoring targets.

It exists to prevent the parser from drifting into ad hoc keep/collapse rules.

Canonical `PlacementNode` is not any arbitrary React/JSX node. It is only an authoring-meaningful usage site that can be a legitimate persistence target.

## Node classes

The parser/normalizer must classify raw findings into these classes before generating canonical ids:

- `ComponentDefinitionNode`
- `PlacementNode`
- `StructuralNode`
- `RepeatedPatternNode`
- `TechnicalWrapperNode`
- `EnrichmentWrapperNode`

## Canonical rules

### 1. `TechnicalWrapperNode` must collapse

These nodes must not survive into canonical placement ancestry unless they carry irreplaceable authoring meaning.

Typical examples:

- framework/runtime wrappers
- implementation-only helper wrappers
- memo/forwardRef-style shells
- internal technical boundaries

### 2. `EnrichmentWrapperNode` must collapse

These nodes are allowed for instrumentation, enrichment, or debugging, but they must not become canonical persistence targets.

Typical examples:

- inspector boundaries
- debug-only wrappers
- temporary authoring hints
- host-specific enrichment shells

### 3. `StructuralNode` is kept only when it carries layout or authoring semantics

A structural node may survive normalization only if it represents a meaningful layout or placement context.

Keep examples:

- slot container with stable layout meaning
- modal footer/header/content sections
- toolbar groups that define placement semantics
- card body/header/actions regions when those regions matter for tuning

Collapse examples:

- anonymous wrapper `div` used only for spacing glue
- implementation-only nested container with no semantic or authoring meaning

### 4. `PlacementNode` is a stable usage site

`PlacementNode` represents a specific usage of a component in a specific normalized source context.

It must not be assigned to every raw wrapper or JSX node.

It should survive refactors better than raw wrapper ancestry.

### 5. `RepeatedPatternNode` is not a primary persistence target

Repeated patterns exist to explain and group runtime repetitions.

They may appear in normalized trees, but their main role is:

- repeated-pattern explanation
- runtime grouping
- resolution from clicked runtime projection back to the shared source target

They should normally resolve editing to a shared `PlacementNode` or `ComponentDefinitionNode`.

### 6. `SourceNodeId` is generated only after canonical normalization

Do not generate canonical ids from raw parser output before keep/collapse rules are applied.

Raw ids may exist internally for debug and intermediate transforms, but canonical ids must be based on normalized nodes only.

### 7. Placement path is built from normalized semantic ancestry

Canonical placement ancestry must be derived from normalized kept nodes, not raw wrapper ancestry.

This means:

- collapsed wrappers do not appear in placement paths
- normalized structural ancestors may appear
- repeated runtime instances do not define canonical placement path by themselves

## Normalization flow

The parser pipeline should be understood in these stages:

1. raw parse
2. raw node classification
3. keep/collapse normalization
4. canonical tree projection
5. canonical id generation
6. runtime projection mapping

Canonical `SourceNodeId` must be generated only after step 4 or later.

## Projection rules

### Source tree

The primary tree should show normalized nodes only.

It should prefer:

- `ComponentDefinitionNode`
- `PlacementNode`
- `StructuralNode` only when meaningful
- `RepeatedPatternNode` only when useful for explanation or grouping

It should not expose:

- arbitrary technical wrappers
- enrichment-only wrappers
- raw JSX wrappers with no authoring meaning

### Runtime projection

Runtime selection may hit any visible rendered element.

The system should then:

1. resolve runtime projection
2. map it to the nearest normalized source-level target
3. explain whether the user selected:
   - a component definition context
   - a placement
   - a repeated pattern instance

## Examples

### Example A: technical boundary wrapper

Raw shape:

- `InspectorNodeBoundary`
  - `Button`

Normalized shape:

- `Button` as `PlacementNode`

`InspectorNodeBoundary` collapses as `EnrichmentWrapperNode`.

### Example B: meaningful structural region

Raw shape:

- `SettingsModal`
  - `Footer`
    - `Button`

Normalized shape:

- `SettingsModal` as `PlacementNode` or `ComponentDefinitionNode` depending on context
  - `Footer` as `StructuralNode`
    - `Button` as `PlacementNode`

`Footer` survives because it provides legitimate placement semantics.

### Example C: repeated list item

Raw/runtime shape:

- many rendered `TaskRow` instances

Normalized shape:

- `TaskList`
  - `TaskRow` as shared `PlacementNode`
  - optional `RepeatedPatternNode` for explanation/grouping

The 17th runtime row is not a canonical persistence target.

## Current implementation consequence

Current runtime/fiber graph can continue to exist for:

- bootstrap
- projection
- preview
- debug

But parser and normalizer work must now follow this policy before generating canonical source identities.
