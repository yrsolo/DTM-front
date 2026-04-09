# Roadmap

Active campaign priorities are defined in `work/now/*`.

## In priority

| CAM | Goal | Priority | Status | Link |
|---|---|---|---|---|
| CAM-API-V2-LOADING-SWR-CACHE | Stale-while-revalidate loading and local cache UX | P0 | active-now | `work/roadmap/campaigns/CAM-API-V2-LOADING-SWR-CACHE/` |
| CAM-SCHEMA-CONTRACT-GOVERNANCE | Align snapshot types/schema + add validation and guarantees | P1 | done | `work/roadmap/campaigns/CAM-SCHEMA-CONTRACT-GOVERNANCE/` |

## Deferred
- CDN/CI/layout campaigns are intentionally deprioritized for now.

## Workbench Authoring direction

Workbench work is being realigned from inspector-centric slices to a future standalone authoring product.

Canonical journey:

`Parse -> Enrich -> Inspect -> Tune -> Consolidate -> Persist`

Canonical persistence identity is source-analysis-first. Runtime/fiber/DOM are projection and preview layers, not the basis for `Persist`.

Current implementation lane:
- source-analysis now generates opaque `wbid-v1` ids and per-file instrumentation manifests
- Vite auto-instruments local JSX host nodes with `data-wb-id`
- inspector binding is moving to `SourceNodeId <-> data-wb-id <-> DOM`, with legacy heuristics kept only as fallback for opaque/legacy nodes
- web authoring snapshots now expand to `app + route`, so source-first trees can cover shell/layout nodes without treating them as runtime-only supplements
- connected route/page snapshots are now governed by a single surface registry (`apps/web/src/inspector-integration/workbench-source-surfaces.json`), and `npm run workbench:build-source-snapshots:web` rebuilds all registered pages from that registry instead of hardcoded entry pairs
- `Hide invisible` and `Meaningful components` are now being tightened around direct rendered DOM presence so canonical source trees stay useful for editing instead of surfacing technical route/provider wrappers
- meaningful mode now also suppresses runtime-only route shells and the app's internal `ControlsWorkbench` branch so canonical page controls stay visible instead of being pushed below technical scaffolding
- inspector details UI is shifting from debug-first to source-first authoring: generated snapshots now carry `sourceBackedParameters` with explicit origin metadata, the primary pane shows only honest source-derived values, and runtime bounds/binding/overlay state stay confined to the collapsed diagnostics block
- source-backed extraction now also covers design-facing JSX presentation attributes (`x/y/width/height/fill/stroke/fontSize/...`), so geometry and color values from authored SVG/JSX can drive the main panel instead of only content literals
- the upper inspector pane no longer mixes source-backed cards with structure/bridge/debug metadata; those sections live only in collapsed diagnostics, keeping the main surface closer to an authoring panel than a debugger
- source-backed editing now has its own draft lane: parameter rows can create `SourceBackedDraftChange` entries, preview applies directly to canonical DOM nodes bound by `data-wb-id`, and CSS-backed values can be previewed either as shared-rule edits or placement-local overrides
- source-backed apply is now modeled as patch planning plus a local authoring bridge: the app builds JSX/CSS patch plans, applies them through the local Vite dev endpoint `/__workbench/source-sync/apply` when available, and keeps `dtm:inspector-apply-patches` as a fallback for non-dev or external hosts
- source-backed parameter rows are moving closer to an editor surface: number and color parameters now use typed controls, and draft review is grouped by source file so apply decisions map back to concrete files instead of a flat debug list
- numeric and length source-backed parameters now also expose sliders next to precise inputs, giving the inspector a more design-tool-like tuning surface while preserving the same source-backed draft/apply semantics
- slider-based numeric tuning now also keeps source-backed reset behavior and collapsible `min/max` controls per parameter, so the editor can stay compact by default while still allowing custom ranges when needed
- promo fixed-scale rendering now uses left-edge transform origins for the scene and glass nav, so the scaled `1920px` composition shrinks uniformly inside the centered wrapper instead of exposing a large empty gutter on the left
- numeric/length source-backed drafts now normalize locale decimal commas to canonical decimal points before preview/apply, closing a generic class of CSS editing failures for fractional `left/right/top/bottom/x/y/...` values
- CSS/style-backed `length` drafts with unitless zero origins now default to `px` during preview/apply normalization, so properties like `right: 0` or `left: 0` remain editable instead of emitting invalid unitless fractional values
- source-backed draft actions are now global to the inspector session rather than tied only to the currently selected node, so `Review changes / Discard drafts / Apply drafts` stay available after changing selection
- draft review is now the primary control surface for persistence: each draft row supports `Apply` directly, the panel exposes `Apply all`, and clicking a draft row jumps to the owning node and reveals it on the page
- source-backed apply planning no longer runs in the browser bundle; the client only previews drafts and sends them to the dev server apply bridge, which removes `typescript/postcss/path/fs` browser warnings and makes per-draft apply deterministic
- numeric/length parameter rows now fall back to text input when the source value is not purely numeric (for example `0 auto`), avoiding repeated browser warnings from feeding CSS strings into `type=number`
- slider controls are now also limited to true scalar number/length values, so composite CSS values like `calc(...)`, `0 auto`, or shorthand lists no longer try to render through range inputs
- source-backed CSS apply now preserves exact selector identity for grouped selectors and selectors with pseudo-classes such as `:nth-child(...)`, so dev-bridge patching no longer loses rule identity when applying promo CSS drafts
- source-backed parameter rendering now lifts contextual layout/spacing controls from the nearest source-backed ancestors, so selecting leaf text/image nodes can still expose editable block width/position settings defined on wrapper nodes instead of showing an empty panel
- overlay highlight rects are now clipped to the viewport before rendering, so elements that scroll fully outside the screen do not leave a stuck highlight strip pinned to the top edge
- promo noise overlay now lives on the page shell instead of inside the scaled scene subtree, which makes its layering independent from local section stacking contexts: it stays above promo blocks, below the fixed menu, and never intercepts pointer events
- promo noise overlay now also uses its own scaled shell synchronized with the `1920px` scene, so moving the layer above content no longer dilutes the perceived noise strength on downscaled layouts

Authoring-product campaigns:

- `CAM-WORKBENCH-AUTHORING-VISION`
- `CAM-WORKBENCH-SOURCE-GRAPH`
- `CAM-WORKBENCH-AUTHORING-MODEL`
- `CAM-WORKBENCH-LIVE-PREVIEW`
- `CAM-WORKBENCH-CONSOLIDATION`
- `CAM-WORKBENCH-SOURCE-SYNC`
- `CAM-WORKBENCH-HARDENING`

Legacy `CAM-WORKBENCH-INSPECTOR-*` campaigns remain as groundwork for the shell, pick mode, tree UI, and host bridge, but they are no longer the product roadmap center.
