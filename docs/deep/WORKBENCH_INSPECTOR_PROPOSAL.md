# Workbench Inspector Proposal

## Status
Foundation approved for implementation.

## Purpose

Workbench Inspector is a local dev-only contextual layer that sits on top of the live application UI and helps developers navigate the existing design/runtime system faster.

It is not:

- a second editor
- a page builder
- a production feature
- a backend-driven tool

## Core idea

The inspector should help developers:

- inspect any live page through a universal DOM-first tree
- identify a meaningful visual node and optionally enrich it with semantic metadata
- browse the hierarchy without losing context
- mark a focused design-tuning subset and hide irrelevant noise
- understand which workbench area owns that target
- jump into the current workbench flow

The current workbench remains the canonical owner of runtime values.

The inspector is a navigation and tuning shell around the live UI graph, with semantic enrichment layered on top when the host app can provide it. It is not a second editor.

## Architectural stance

- generic inspector code lives in `packages/workbench-inspector/`
- app-specific mapping lives only in `apps/web/src/inspector-integration/`
- the package must remain extractable later with minimal changes
- hierarchy, focus-set state, and persistence are package-owned UI concerns
- the package owns DOM scanning, tree navigation, pick mode, and generic properties presentation
- ownership refs, semantic target metadata, and workbench bridge actions stay app-owned
- tree rendering uses a ready-made foundation (`react-arborist`), not custom tree widgets
