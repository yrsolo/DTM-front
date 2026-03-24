# Workbench Inspector Delivery Process

## Foundation goals

The first delivery slice must provide:

- package skeleton
- narrow public API
- thin app integration seam
- local dev-only activation path
- no-op mount path
- baseline documentation

## Explicit non-goals

Foundation must not ship:

- hover or selection overlay behavior
- workbench focus switching UX
- runtime value editing
- backend persistence
- production exposure

## Acceptance checks

- `apps/web` builds successfully
- inspector stays disabled by default
- activation requires both dev mode and explicit local opt-in
- no package import points back into app code
- current workbench remains untouched when inspector is disabled
