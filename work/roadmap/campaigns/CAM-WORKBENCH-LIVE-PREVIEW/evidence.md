# CAM-WORKBENCH-LIVE-PREVIEW Evidence

- Draft foundation added to the browser shell:
  - shared `DraftChange` contracts and scope/status enums in `packages/workbench-contracts`
  - browser-owned draft persistence and reconciliation in `packages/workbench-inspector/src/runtime/InspectorContext.tsx`
  - host preview bridge hook via `InspectorAdapter.applyDraftChanges`
- Inspector shell now exposes preview-oriented draft UX:
  - draft section in the selected-node panel
  - add/remove/clear actions for `token`, `component`, `placement`, and `instance-preview`
  - explicit draft statuses instead of silent drop on refresh
- Scoped host preview application foundation now exists:
  - `Layout` computes layered `effectiveDesign` / `effectiveKeyColors` over canonical host state
  - host preview bridge applies token-scope draft overlays without mutating base `design` / `keyColors`
  - unsupported scopes are surfaced honestly through host capabilities instead of being faked by global overwrites
  - `TimelinePage` now renders from `effectiveDesign`, so token preview changes can affect the live timeline shell
  - parameter cards now include real editable inputs, so token preview is no longer limited to demo draft payloads
- Verified:
  - `npm run build` in `apps/web`
