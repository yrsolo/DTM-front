# Workbench Inspector Structure

## Package structure

`packages/workbench-inspector/src/` is organized into:

- `contracts/` for public-facing generic types
- `model/` for internal state model helpers
- `runtime/` for provider/context wiring
- `core/` for public hooks
- `overlay/` for overlay primitives
- `panels/` for sidebar/panel primitives
- `ui/` for future generic UI pieces
- `utils/` for neutral helper utilities
- `types/` for type re-exports

Only `public.ts` is a public entrypoint.

## App structure

`apps/web/src/inspector-integration/` contains only host-side glue:

- `activation.ts`
- `targetRegistry.ts`
- `targetBindings.ts`
- `openWorkbench.ts`
- `workbenchOwnership.ts`
- `targetGuards.ts`
- `index.ts`

The rest of the app should treat this folder as the single entry to inspector integration.
