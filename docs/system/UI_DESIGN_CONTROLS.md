# UI Design Controls and Milestones

This document captures the implemented UI tuning system for the Gantt/tasks page.

## Scope
- Current app route is focused on `/tasks` only.
- The interactive design controls are available in browser and affect runtime layout/style without rebuild.

## Data loading mode
- Default load source: local snapshot JSON.
- Actions in top filter bar:
  - "Refresh from local JSON" -> reloads local snapshot cache/file.
  - "Refresh JSON from API" -> fetches API snapshot and stores it locally.
- Local snapshot storage key:
  - `dtm.web.localSnapshotRaw.v1`

## Control panels
Control dock includes four panels:
- `Material controls`
- `Color controls`
- `Task palette`
- `Design controls`

Implemented in:
- `apps/web/src/components/Layout.tsx`
- `apps/web/src/components/*ControlsPanel.tsx`

## Design controls (geometry and timeline)
Design controls include layout and timeline parameters, including:
- table row/cell metrics
- left panel width and timeline sizes
- date label Y offset
- bar radius/inset
- milestone size and opacity
- task random color mix percent

Definitions and defaults:
- `apps/web/src/design/controls.ts`

Persistence:
- local storage keys:
  - `dtm.web.uiPreset.v1` (combined preset)
  - `dtm.web.designControls.v1` (legacy/compat design-only)
- deploy preset path:
  - `/config/design-controls.json`

Panel features:
- Save local / Load local / Reset
- Export preset / Import preset
- Load deploy preset (from `/config/design-controls.json`)

## Material controls
Material controls tune depth and atmosphere parameters:
- background gradient opacities
- card border/shadow/inset strengths
- active/button/badge glow strengths
- row hover and scrollbar glow strengths

Definitions:
- `MATERIAL_CONTROL_ITEMS` in `apps/web/src/design/controls.ts`

## Color controls
Key color panel edits CSS variables used by timeline/background:
- `--key-pink`, `--key-blue`, `--key-mint`, `--key-violet`
- `--key-milestone`
- `--key-surface-top`, `--key-surface-bottom`, `--key-surface-alt`
- `--key-text`

Definitions:
- `apps/web/src/design/colors.ts`

## Task palette controls
Task palette panel configures 8 base task colors:
- `taskColor1` ... `taskColor8`

Task bars use deterministic per-task palette selection by task id, then blend with the base gradient by `taskColorMixPercent`.

Related code:
- palette definitions: `apps/web/src/design/colors.ts`
- bar rendering/mix: `apps/web/src/gantt/TaskBar.tsx`

## Milestones
Milestones are rendered on task bars as rotated diamonds, larger than line thickness, with labels above marker.

Behavior:
- marker size controlled by `milestoneSizeScale`
- marker transparency controlled by `milestoneOpacity`
- milestone labels shown above marker (short type label)

Related code:
- layout includes milestone dates in visible range: `apps/web/src/gantt/layout.ts`
- marker rendering and labels: `apps/web/src/gantt/TaskBar.tsx`

## Timeline interaction and labels
- Mouse wheel over timeline changes zoom (`0.4 .. 5`).
- Date labels are day numbers only (`DD`), no month/year text.
- Label frequency is every 2 days.

Related code:
- wheel zoom: `apps/web/src/pages/TasksPage.tsx`
- label rendering: `apps/web/src/gantt/TimelineGrid.tsx`

## Row alignment and fixed height
- Table rows are fixed-height from design control (`tableRowHeight`).
- Timeline row height uses the same value for visual sync.
- This prevents content (for example status badge) from stretching row height and breaking alignment.
