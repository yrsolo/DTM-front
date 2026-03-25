# CAM-WORKBENCH-INSPECTOR-BINDINGS Plan

## Steps

1. Keep ownership refs app-owned and route them through `apps/web/src/inspector-integration/`.
2. Bind semantic targets to existing workbench tabs and safe host registries.
3. Use lightweight host metadata such as `ownerTab`, `designArea`, and `tuningPriority` to improve tuning context.
4. Verify ownership labels and open-in-workbench behavior without leaking app concerns into the package.
