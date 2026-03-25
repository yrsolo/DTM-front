# CAM-WORKBENCH-INSPECTOR-BINDINGS Evidence

## Implemented

- added semantic target ids for tasks timeline/table, designers timeline/board, task drawer, and attachments section
- mapped new targets to existing workbench tabs
- enriched ownership refs for selected targets from `apps/web/src/design/uiRegistry.ts`
- kept the package generic and app-agnostic

## Verification

- `npm run build` in `apps/web` passes
- Playwright can open the dev app with `?inspector=1`
- normal click still opens live app UI such as `TaskDetailsDrawer`
- `Alt+Click` resolves live targets such as `app.task.drawer`, `app.timeline.page-switch`, and `app.timeline.filters`
- sidebar shows parent and ownership refs for these live targets without breaking the page
- sidebar now includes a target browser backed by the semantic registry, so non-mounted targets like `app.designers.board` can still be inspected
- target metadata is visible in the sidebar; verified example: `app.designers.board` shows `scope: designers` and `availability: mode-gated`

## Remaining

- broader interactive browser verification for routes/views that mount every new target
- designers-mode verification is currently gated because the designers page switch is not rendered in the current session (`canUseDesignerGrouping === false`)
- decide how far to take control-level bindings in later slices
