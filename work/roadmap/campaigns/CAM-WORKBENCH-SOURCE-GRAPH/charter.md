# CAM-WORKBENCH-SOURCE-GRAPH

## Objective

Make `SourceGraph` the primary tree by parsing React/source structure automatically and mapping it to runtime projections.

## In scope

- automatic parse pipeline
- `SourceNode`
- `ComponentDefinitionNode`
- `PlacementNode`
- `RepeatedProjectionGroup`
- parse vs enrich split
- `RuntimeProjection` mapping
- manual annotations only as fallback
- canonical parser scope limited to local source and locally resolvable React components
- external components as opaque nodes only
- stable ids only after canonical normalization
- symbol-level continuation across imports, exports, aliases, and barrels

## Additional rules

- repeated runtime instances are usually resolved back to a shared placement/template target
- page-by-page manual tree authoring must not become the main scaling strategy
- host-specific normalization overrides must stay declarative, not ad hoc parser branches
- whole-module expansion is forbidden when a concrete symbol target is known

## Out of scope

- authoring value model
- live preview editing
- source patch generation
- parsing of `node_modules` internals as canonical tree
