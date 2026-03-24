# CAM-WORKBENCH-INSPECTOR-BINDINGS

## Goal

Connect semantic inspector targets to the existing workbench through app-owned bindings while preserving a clean package boundary.

## Non-goals

- no second editor state
- no runtime value editing inside inspector
- no production exposure
- no package dependency on app code

## Guardrails

- app-specific mapping lives only in `apps/web/src/inspector-integration/*`
- package exports remain generic
- current workbench stays canonical source of truth
