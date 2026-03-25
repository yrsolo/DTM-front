# Workbench Inspector Proposal

## Status
Implemented as the current local dev shell layer. No longer the final product architecture.

## Purpose

Workbench Inspector is a local dev-only shell layer that sits on top of the live application UI and helps developers navigate and inspect the current system while the broader Workbench Authoring product is being built.

It is not:

- a second editor
- a page builder
- a production feature
- a backend-driven tool

## Core idea

The inspector should help developers:

- inspect any live page through a universal React-first tree
- identify a meaningful visual node and optionally enrich it with semantic metadata
- browse the hierarchy without losing context
- mark a focused design-tuning subset and hide irrelevant noise
- understand which workbench area owns that target
- jump into the current workbench flow

The current workbench remains the canonical owner of runtime values.

The inspector is a navigation and tuning shell around the live UI graph, with semantic enrichment layered on top when the host app can provide it. It is not a second editor and it is not the future product core.

## Architectural stance

- generic inspector code lives in `packages/workbench-inspector/`
- app-specific mapping lives only in `apps/web/src/inspector-integration/`
- the package must remain extractable later with minimal changes
- hierarchy, focus-set state, and persistence are package-owned UI concerns
- the package owns runtime React registration, tree navigation, pick mode, and generic properties presentation
- ownership refs, semantic target metadata, and workbench bridge actions stay app-owned
- tree rendering uses a ready-made foundation (`react-arborist`), not custom tree widgets

## Transition note

The future target architecture is described in [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md).

That architecture changes the center of gravity:

- primary model becomes `SourceGraph`
- inspector becomes shell/delivery layer
- runtime/DOM becomes `RuntimeProjection`
- persistence moves into an explicit source-sync phase

## Reading order

- quick team-facing overview: [../glance/WORKBENCH_INSPECTOR_OVERVIEW.md](../glance/WORKBENCH_INSPECTOR_OVERVIEW.md)
- current runtime behavior: [WORKBENCH_INSPECTOR_TECHNICAL.md](WORKBENCH_INSPECTOR_TECHNICAL.md)
- package/app structure: [WORKBENCH_INSPECTOR_STRUCTURE.md](WORKBENCH_INSPECTOR_STRUCTURE.md)
