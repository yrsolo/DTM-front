# CAM-WORKBENCH-SOURCE-SYNC

## Objective

Persist consolidated authoring decisions back into source files through explicit safe patches.

## In scope

- `SourceSyncPatch`
- patch proposal and review flow
- safe write zones
- apply/review workflow

## Out of scope

- unstable authoring semantics
- direct live-preview writes to source

## Gate

Do not begin this campaign seriously until the following are stable:

- `SourceNode`
- `AuthoringValue`
- draft format
- scope model: token, component, instance
- stable distinction between `ComponentDefinitionNode` and `PlacementNode`

## Persistence rule

The normal persistence targets are component definitions and placements, not arbitrary repeated runtime instances produced by loops.

## Additional write rules

- no direct writes from runtime interaction
- source sync must follow `parse -> draft -> consolidate -> patch proposal -> apply`
- DOM nodes, fiber paths, runtime instances, and repeated groups are not patch targets
