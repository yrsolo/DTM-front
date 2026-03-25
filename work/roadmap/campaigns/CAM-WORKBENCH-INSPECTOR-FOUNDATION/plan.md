# CAM-WORKBENCH-INSPECTOR-FOUNDATION Plan

1. Create `packages/workbench-inspector/` with a narrow public API.
2. Create `apps/web/src/inspector-integration/` as the only app-aware bridge.
3. Mount the inspector through a dev-only explicit opt-in path.
4. Add docs that freeze package/app boundaries.
5. Verify build safety and disabled-mode safety.
