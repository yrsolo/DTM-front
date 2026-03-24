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

- identify a semantic visual target
- understand which workbench area owns that target
- jump into the current workbench flow

The current workbench remains the canonical owner of runtime values.

## Architectural stance

- generic inspector code lives in `packages/workbench-inspector/`
- app-specific mapping lives only in `apps/web/src/inspector-integration/`
- the package must remain extractable later with minimal changes
