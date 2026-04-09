# NOW - tasks

## Active
- [x] CAM-TELEGRAM-MINIAPP-V1 - auth linkage, `/app` shell, client-side mine/all selectors, mobile task/agenda/profile UX, docs refresh.
- [x] CAM-TELEGRAM-MINIAPP-V1 follow-up - Telegram linkage recovery fixed: auth auto-heal via `telegramId -> yandexEmail`, explicit Mini App unlinked state, docs refreshed.
- [x] CAM-ATTACHMENTS-UPLOAD-PREVIEW-V1 follow-up - frontend aligned with backend handoff: auth facade control-plane, direct presigned `PUT`, `jobs/{job_id}` polling, contour-safe `view/download`, drawer-wide drag-and-drop upload, docs refreshed.
- [x] CAM-ADMIN-TABS-TEMP-ACCESS-LINKS-V1 - admin IA rewritten into `Доступ / Стиль`, `Люди / Ссылки / Пресеты` tabs; temp-link runtime shipped end-to-end with YDB storage, redemption, `/me` session metadata, admin CRUD/revoke/stats UI, and auth-panel countdown.
- [x] CAM-ADMIN-STYLE-UI-INVENTORY-REAL-ELEMENTS-V2 - `Стиль -> UI` rebuilt from synthetic demo registry into a real project-wide UI inventory with fixed Cyrillic, surface-aware search/filter, similarity-ordered row cards, live previews, and canonical docs refresh.
- [x] CAM-MOBILE-WEB-FROM-MINIAPP-V1 - mobile web route `/m` now reuses the Telegram Mini App shell with Yandex auth, no Telegram-only bootstrap requirement, shared task/profile/timeline UX, and gateway/docs updates.
- [x] CAM-PROMO-LANDING-V1 - public `/promo` landing shipped with separate runtime content file, manual-play hero video, short/full marketing blocks, dedicated promo shell, screenshot-led product scenes from viewer-safe captures, and docs updates.
- [x] CAM-PROMO-REFERENCE-PACK-V1 - stable promo reference pack committed in-repo with master ref, 5 scene slices, reading guide, comparison checklist, and mandatory review loop for future `/promo` iterations.
- [x] CAM-PROMO-REFERENCE-ALIGNMENT-V2 - `/promo` rebuilt into a screenshot-led editorial narrative: single-focus hero, secondary video strip, editorial/showcase/summary/cta section types, baseline-vs-after screenshots, and review note against the promo reference pack.
- [x] CAM-PROMO-REBUILD-FROM-DRAFT-V3 - rebuild local `/promo` around clean background scenes from `ref/02`, replace raster copy with live Roboto text blocks, preserve promo-draft composition as reference only, and keep reusable noise overlay.
- [ ] CAM-ATTACHMENTS-PDF-PREVIEW-STANDARDIZATION - force PDF.js preview even with missing metadata, align modal copy, and avoid browser viewer fallbacks.
- [ ] CAM-TELEGRAM-MINIAPP-NO-YANDEX-AUTH - allow Telegram Mini App access for people directory telegram IDs without Yandex login.
- [ ] CAM-USER-ALL-TASKS-FLAG - admin-controlled all-tasks access + hide designer grouping for non-privileged users.
- [ ] CAM-FORMAT-NORMALIZATION-LAB-V1 - repo-owned full task snapshot, YAML source-of-truth for normalized `format_` rules/manual mappings, local `/format-sort`, and local `/designer-sort` drag-and-drop labs with manual full-data refresh and JSON export.
- [ ] CAM-DEPARTMENT-ANALYTICS-PAGE-V1 - standalone `/analytics` lab with manual full SnapshotV1 refresh, monthly production table, weighted department-load chart, editable format-hour prices, and designer-category filters via local designer-sort config.
- [ ] CAM-DEPARTMENT-ANALYTICS-UX-REFINE-V2 - `/analytics` rebuilt around donut-based format breakdowns, period controls, and a cleaner productivity chart with smoothed load/capacity lines and tooltips.
- [ ] CAM-TEMP-LINK-TASKS-GROUPING-FIX - restore task visibility for temp-link sessions, add per-link designer-grouping toggle, and roll out auth/web changes with YDB migration.
- [x] CAM-LOCAL-DEV-AUTH-LANE-V1 - localhost-only `test` auth lane with `dev_local` sessions, bootstrap/dev-token exchange, localhost auth-panel persona switcher, admin-managed developer tokens, auth/docs refresh.
- [ ] CAM-API-V2-LOADING-SWR-CACHE - finalize manual evidence pack.
- [x] CAM-SCHEMA-CONTRACT-GOVERNANCE - schema/types sync + validate:schema + guarantees.
- [ ] CAM-DOCS-CANONICAL-REWRITE - rebuild root README and docs tree around current frontend state.
- [ ] CAM-AUTH-YANDEX-MASKED-PROXY-ADMIN-V1 - auth function, masked access mode, admin SPA, YDB test/prod contours. Routing contract updated to `prod=/`, `test=/test`, service namespace moved to `/ops/*`, frontend buckets split to `dtm-front` and `dtm-front-test`; test contour remains the active rollout target.

## SWR status
- [x] SWR runtime implemented (cache + background refresh + stale_error).
- [x] Timeout/retry implemented.
- [x] Conditional 304 path implemented.
- [x] Build is green.
- [ ] Collect manual evidence (video/screenshot/devtools/logs).

## Blocked
- Manual evidence capture requires browser actions:
  - video for instant second launch + Updating...
  - screenshot of stale banner when API is offline
  - screenshot of localStorage keys
  - screenshot/log snippet for timeout/retry

See: `docs/deep/TROUBLESHOOTING.md`

## Session 2026-03-07
- [x] Milestone tone aliases: added resilient RU/EN mapping for card/calendar milestone colors using active API milestone names (work/pre_done/wait only).
- [x] Timeline: added page switch (`Задачи` / `Дизайнеры`) and designer columns board view with task cards + milestone/manager hover tooltip.

## Session 2026-03-11
- [x] GitHub deploy workflows rebuilt: frontend upload moved to S3-compatible `aws s3`, auth workflow no longer installs `yc` CLI and deploys via `yc-actions/yc-sls-function`.

## Session 2026-03-12
- [x] Auth/admin UX completion: auth-panel now explains login/access/admin state, masking control moved into the panel, admin page access states and RU copy cleaned up.
- [x] Auth session fix: auth function now reads cookies from YC gateway event shapes and returns multi-value `Set-Cookie`; test account `yrsolo@yandex.ru` promoted to `approved/admin` in test YDB.
- [x] Admin panel expanded: pending and approved user lists, soft reject flow, admin role controls, request timestamps, avatars, and self-lockout protection. Test frontend/auth contour redeployed.
- [x] Backend auth handoff clarified: browser masking toggle now maps to `with auth` vs `without auth` API requests; auth proxy forwards trusted `x-dtm-*` access headers upstream; Yandex avatar URL is stored from profile metadata.
- [x] Workbench re-architecture: canonical tabs replaced historical taxonomy, duplicate/orphan controls removed from layout, workbench tab persistence added, and audit report + taxonomy docs prepared.

## Session 2026-03-19
- [x] Standalone static demo page added at `presentation/hr-analytics/`: modern corporate dark presentation rebuilt from HR analytics slide as isolated HTML/CSS/JS, with deploy alias support for nested `index.html` -> slashless static URLs.

## Session 2026-03-20
- [x] Designer-sort name source corrected: full format-sort snapshots now preserve `people`, `/designer-sort` resolves historical designers from snapshot people first, and approved auth people seed automatic `В штате` grouping.

## Session 2026-04-08
- [x] Inspector source-backed CSS length drafts now default unitless zero-based properties like `right: 0` / `left: 0` to `px` during preview/apply normalization, fixing non-moving horizontal positioning edits on promo-like surfaces.
- [x] Inspector draft workflow is now global across selection changes: `Review changes`, `Discard drafts`, and `Apply drafts` stay visible while any source-backed drafts exist, even if the user selects a different node afterward.
- [x] Inspector draft review now supports per-draft `Apply`, explicit `Apply all`, pending-draft status, and click-to-focus behavior that selects the owning node and reveals it on the page.
- [x] Inspector apply path no longer tries to load TypeScript/PostCSS/path/fs in the browser; source-backed drafts are now sent directly to the dev apply bridge, and non-numeric CSS strings like `0 auto` no longer get pushed into numeric inputs.
- [x] Inspector overlay highlights are now viewport-clipped before render, fixing the stuck top-edge rectangle when a selected element scrolls fully above the screen.
- [x] Inspector sliders are now disabled for composite CSS values like `calc(...)`, `0 auto`, and shorthand lists; slider controls stay only on true scalar number/length values, removing remaining browser parse warnings from the tuning UI.
- [x] Promo noise overlay is now rendered at the page-shell level instead of inside the scaled scene, so it sits above promo content globally, stays below the fixed glass menu, and keeps `pointer-events: none` to avoid blocking interactions.
- [x] Promo noise overlay scaling is now aligned with the scaled `1920px` scene via a dedicated overlay shell, restoring the previous grain density/strength while keeping the shell-level stacking above content and below the menu.
# Workbench Inspector

- [x] CAM-WORKBENCH-INSPECTOR-FOUNDATION - create package boundary, app integration seam, dev-only activation path, and baseline docs
- [x] CAM-WORKBENCH-INSPECTOR-SELECTION - semantic hover/select overlay
- [x] CAM-WORKBENCH-INSPECTOR-NAVIGATION - DOM-first hierarchy tree, expand/collapse state, search, and pick-mode shell
- [x] CAM-WORKBENCH-INSPECTOR-FOCUS-SETS - marked targets, focus-only filtering, local dev persistence
- [ ] CAM-WORKBENCH-INSPECTOR-BINDINGS - target ownership mapping into current workbench
- [ ] CAM-WORKBENCH-INSPECTOR-LIVE-COVERAGE - broaden verified target coverage across live surfaces
- [ ] CAM-WORKBENCH-INSPECTOR-TREE-DOM-BINDING-V1 - stabilize bidirectional tree <-> DOM mapping for placement / repeated-group / runtime-projection nodes, make tree-selection highlight projection-first, and align pick-mode with the same binding model

## Session 2026-03-24
- [x] Workbench Inspector bindings MVP expanded: semantic targets added for tasks timeline/table, designers timeline/board, task drawer, and attachments section.
- [x] Inspector ownership refs now combine workbench tabs with app-side UI registry metadata for drawer / attachments / designers board without leaking app concerns into the package.
- [x] Inspector selection no longer hijacks normal page clicks: live inspection now uses `Alt+Click`, and browser checks confirm normal drawer opening plus live targets for page switch and filters panel.
- [x] Inspector sidebar now supports semantic target browsing and target metadata, including navigation to non-mounted targets like `app.designers.board` with explicit `mode-gated` status.
- [x] Inspector hierarchy became a first-class tree: expand/collapse is independent from selection, search reveals semantic paths, and visibility badges stay app-owned.
- [x] Inspector focus sets shipped as a dev-only package concern: targets can be marked from the tree or selected-target panel, focus mode hides unrelated branches, and local persistence survives reload.
- [x] Inspector shell now has an always-visible draggable launcher for `?inspector=1`, can be expanded without prior selection, and collapses back into a narrow draggable button while preserving position.
- [x] Inspector shell was rebuilt into a DOM-first Figma-like workspace: `react-arborist` tree on the left, mixed properties on the right, explicit pick-mode toggle with page shield, tree-hover page highlight, and semantic/workbench enrichment layered on top of universal node inspection.
- [x] Workbench Authoring source-graph foundation moved past pure runtime parsing: source-analysis strategy and placement normalization policy are now documented, shared contracts now live in `packages/workbench-contracts`, node-side source analysis now lives in `packages/workbench-source-analysis`, and the AST probe now builds normalized source trees with collapsed enrichment wrappers and local-import traversal.
- [x] Workbench Authoring source continuation now uses TypeScript checker-backed local symbol resolution for imports, emits canonical symbol ids in the probe, and keeps `scripts/workbench_source_identity_probe.mjs` as a thin runner over the node-side analysis package.
- [x] Workbench Authoring baseline source-graph delivery is now wired end-to-end: node-side snapshot builder writes a page-scoped artifact for `TimelinePage`, the browser inspector adapter can supply a `SourceGraphSnapshot`, and inspector context prefers snapshot roots over runtime-only fallback trees.
- [x] Workbench Authoring source/runtime binding foundation added: snapshot nodes now carry explicit `bindingKey`, inspector context builds a source-first binding table with `bound/multiple/unresolved` statuses, pick-mode reverse resolution goes through runtime projection bindings, and snapshot-based selection/highlight no longer depends on accidental id совпадения.
- [x] Workbench Authoring live-preview foundation added: browser shell now owns persistent `DraftChange` entries keyed by `SourceNodeId`, reconciles them after source refresh, exposes draft scopes in the inspector UI, and calls a host preview bridge hook instead of mutating source or DOM directly.
- [x] Workbench Authoring parameter-discovery foundation added: canonical parameter descriptors and effective preview values now flow through shared contracts, app-side discovery is projected from `WORKBENCH_LAYOUT`, and the inspector right panel is driven by descriptors/effective values instead of demo-only controls.
- [x] Scoped host preview foundation added: host preview now uses layered `effectiveDesign` / `effectiveKeyColors` overlays instead of mutating canonical layout state, `TimelinePage` consumes effective preview values, and inspector scope actions are gated by honest host capabilities (`token` only for now).
- [x] Authoring parameter semantics foundation added: descriptors now carry constraint semantics (`min/max/step/editorHint`), generic parse/validate/coerce runs before draft application, effective preview values expose state/normalized value/message, and invalid raw input no longer passes straight into host preview.
- [x] Source graph interior decomposition broadened for meaningful JSX host elements: linked component internals now capture `button/select/span` controls and meaningful container nodes like `div.filters`, making trees deeper for components such as `FiltersBar` and `DesignersBoard` without falling back to raw DOM traversal.

## Session 2026-04-01
- [x] Inspector refresh stabilized: startup now stays snapshot-first, heavy runtime scan is guarded, `Refresh tree` no longer freezes the page, and the tree remains visible after refresh instead of collapsing into an empty state.
- [x] Inspector tree empty-state hardening added: `Hide invisible`, `Focus`, and `Cycles only` no longer trap the shell in a blank tree; the sidebar now falls back to a broader node set and explains which filter was relaxed.
- [ ] Inspector tree/DOM binding plan fixed as the next active stream:
  - `placement`, `repeated-group`, and `runtime-projection` stay separate entities in the binding model
  - tree selection must resolve highlight through `projectionIds -> elements -> rects`
  - repeated groups must highlight every runtime instance, not a single aggregate box
  - pick mode must resolve DOM clicks back through the same projection-first path
  - debug output should expose projection count, resolved element count, and rendered rect count for selected nodes

## Session 2026-04-02
- [x] Promo landing refocused on `promo-draft` composition for the first pass: `/promo` now has a glass top menu, a rebuilt hero, neon transition with video, and a second system screen using the `ref/02` scene assets instead of the old promo structure.
- [x] Promo landing expanded beyond the first pass: `/promo` now renders the remaining draft-inspired screens from structured scene data with `ref/02` backgrounds, separate cutout objects, and browser-checked section continuity instead of stopping after the hero/video/system trio.

## Session 2026-04-04
- [x] Promo draft lock-in docs fixed: `work/now/promo-draft-structure.md` synchronized with `ref/02/draft`, and `work/now/promo-copy.md` created as the text source-of-truth for the 14-screen rebuild.

## Session 2026-04-05
- [x] Promo visual pass tightened against `promo-draft`: `/promo` got a logo in the glass nav, warmer and more consistent typography, revised screen copy, and screen-by-screen layout fixes for hero, phone, benefits, questions, analytics, security, stack, and final CTA with screenshot-based verification.
- [x] Promo stack copy grounded in the real project architecture: screen `13` now references the actual frontend (`React 18`, `TypeScript`, `Vite`) and backend/runtime contour (`Python 3.11`, `Google Sheets`, `Telegram`, `Yandex Cloud Functions`, `Yandex Message Queue`, `Object Storage`, `OpenAI gpt-4o`, `YandexGPT`, `Gemini`, `DataLens`, `Grafana`) instead of invented tech wording.
- [x] Promo nav/layout refinement pass completed against draft screenshots: the glass menu logo was scaled up, anchor navigation now accounts for the fixed header, the `02/04/08/09/11/12/13` screens were rebalanced for the draft rhythm, and `work/now/promo-copy.md` was resynced with the live `/promo` copy.
- [x] Promo screenshot verification switched to fresh `vite preview` output for the latest pass: menu logo capsule removed, `02` pulled closer to `01`, `04` phone shifted left, `06` copied closer to draft label placement, `07/08/09` visuals lifted, `11` title/body stopped colliding with the illustration, and `12` shield/icons were enlarged and raised.
- [x] Promo screen `06` was isolated and rechecked against `ref/02/draft/06.png`: the benefits headline was softened, the supporting line widened, and the three label groups were lowered/spaced to track the draft icons and neon path more faithfully.
- [x] Promo screen `06` received a second corrective pass after stale-preview QA was ruled out: the whole text block was re-anchored deeper into the scene, the three feature groups were spread to the draft-like icon rhythm, and verification switched to a fresh local preview on `127.0.0.1:4175`.
- [x] Promo targeted visual pass for screens `06/08/11`: benefits copy and labels were resized/raised into the draft rhythm, analytics-panel text was re-seated into the cutout with a two-line heading, and the speed-order block was shortened so the text no longer collides with the illustration.
- [x] Promo iterative QA loop completed for screens `06/08/11` on fresh preview screenshots: `06` moved closer to `05` and rebalanced to draft-like proportions, `08` tightened into the panel cutout with draft-like title wrapping, and `11` was compacted until the text fully cleared the illustration.
- [x] Promo visual-control loop was corrected for screens `06/08/11`: section screenshots are now taken directly from `vite preview`, `08` uses a wider true cutout text block, `11` keeps a genuine two-line heading, and `06` was rescaled so the lead text reads closer to the draft slice.

## Session 2026-04-07
- [x] Workbench authoring id bridge foundation added: source-analysis now emits `wbid-v1` opaque ids and instrumentation manifests, Vite auto-injects `data-wb-id` plus scoped host ids into local JSX host nodes, and live DOM buttons (`Задачи / - / + / Сегодня`) now carry the same canonical ids as the source snapshot.

## Session 2026-04-08
- [x] Inspector source-backed parameter panel now extracts design-oriented JSX attributes (`x/y/width/height/fill/stroke/fontSize/...`) in addition to content/style literals, so SVG/timeline nodes expose geometry and visual values from source instead of only text/debug metadata.
- [x] Inspector details pane is now parameter-first in practice: only source-backed cards stay in the main upper panel, while `Structure/Authoring/Bridge/Layout/Binding/Trace` sections were pushed into the collapsed `Diagnostics` block.
- [x] Inspector binding moved to source-first DOM matching: DOM scan now builds `SourceNodeId -> Element[]`, pick-mode/tree resolution can read canonical ids directly from `data-wb-id`, runtime graphs now reuse canonical ids for host nodes where available, and browser checks confirm `bound` source nodes without manual boundary hints.
- [x] Inspector runtime tree stopped duplicating canonical nodes as separate parallel supplements: `All/Meaningful` now stay source-first, runtime-only uncovered branches are added as supplements only, and duplicate runtime nodes with the same canonical `SourceNodeId` are pruned globally instead of rendering twice.
- [x] Web app source snapshot coverage broadened from route-only to `app + route`: inspector adapter now merges `App.tsx` and `TimelinePage.tsx` generated snapshots, topbar/layout nodes can stay canonical instead of runtime-only supplements, and local workflow got `npm run workbench:build-source-snapshots:web`.
- [x] Inspector visibility filtering hardened: `Hide invisible` now relies on actual rendered direct DOM elements, no longer broad-falls back to the full tree when nothing is visible, and flattens technical wrapper branches (`Router/Route/Provider/App*`) out of `Meaningful components` while preserving visible canonical nodes like brand/top controls/text.
- [x] Inspector source-surface registry foundation added: `apps/web/src/inspector-integration/workbench-source-surfaces.json` is now the single source of truth for подключаемые shell/route snapshots, `npm run workbench:build-source-snapshots:web` builds all registered pages automatically, and browser checks confirm `/promo` now gets a canonical source-first tree without hand-editing the adapter.
- [x] Inspector meaningful tree regained timeline controls after wrapper cleanup: runtime-only route wrappers are flattened before supplement merge, empty technical leaves are dropped, and the internal `ControlsWorkbench` branch is excluded from meaningful mode so page controls like the timeline zoom panel surface near the top again.
- [x] Promo page switched from breakpoint-driven rearrangement to a fixed `1920px` scene with uniform downscaling: `/promo` now measures its scene and glass nav, scales them proportionally below `1920px`, and no longer uses internal responsive media rules that broke the desktop composition on narrow screens.
- [x] Inspector details panel switched to a parameter-first layout: editable parameter groups now render at the top with grouped controls and draft actions, while raw node/binding/overlay debug moved into a collapsed `Diagnostics` block that stays hidden by default.
- [x] Inspector source-backed parameter pass added: source-analysis now extracts literal/read-only value origins (`jsx-text`, selected attrs, inline style, className/token/expression refs), generated snapshots carry canonical `sourceBackedParameters`, and the right panel now shows honest source-derived parameters first while runtime coordinates remain in `Diagnostics`.
- [x] Source-backed editing foundation added: inspector now keeps dedicated `SourceBackedDraftChange` entries, source-backed rows render inline editor controls instead of static values, live preview applies through canonical `data-wb-id` bindings (including shared CSS-rule preview vs placement-local override preview), and `Review / Discard / Apply` actions now operate on source-backed drafts rather than the legacy workbench-only draft lane.
- [x] Source-backed patch planning foundation added: the web adapter can now generate file-scoped patch plans for JSX attrs, inline styles, CSS declarations, simple text replacements, expression-wrapping deltas, and CSS-to-inline placement overrides; actual file write still requires an external host bridge to handle the emitted `dtm:inspector-apply-patches` event.
- [x] Source-backed apply bridge is now wired through local Vite dev server: `Apply drafts` can validate base text and write planned JSX/CSS patches into repo files via `/__workbench/source-sync/apply`, while external event fallback remains for non-dev/legacy hosts.
- [x] Source-backed parameter rows now use more editor-like controls in the inspector: numeric params render with numeric inputs, color params get text + color swatch controls, and draft review is grouped by source file instead of one flat list.
- [x] Source-backed numeric and length parameters now expose sliders in the inspector in addition to precise input fields, so layout/style tuning on pages like `/promo` can be adjusted visually without leaving the draft/apply workflow.
- [x] Numeric and length sliders now keep a clear reset path to the original source-backed value and expose collapsible per-parameter range settings (`min/max`) for wider or tighter tuning without leaving the inspector row.
- [x] Promo fixed-scale layout now anchors scene/nav scaling to the wrapper's left edge instead of center, removing the left-side empty gutter that appeared when shrinking the browser window.
- [x] Source-backed numeric draft normalization now accepts locale decimal commas and canonicalizes them to `.` for preview/apply, fixing a whole class of “top works but right/left with fractional values does nothing” issues in CSS-backed editing.
- [x] Source-backed CSS apply matching now keeps exact selector identity for grouped selectors and `:nth-child(...)` rules, so per-draft apply can patch promo rules like `.promoSection { scroll-margin-top }` and `.promoFeatureCard:nth-child(n) { top/left }` instead of failing with “Could not build a source patch”.
- [x] Inspector parameter panel now lifts layout/spacing controls from the nearest source-backed ancestors when the selected node is a content leaf, so text rows can still expose editable width/position context from wrappers like `.promoText__body` and `.promoText`.

## Session 2026-04-09
- [x] Desktop topbar now includes route tabs near the logo/title for `Таблица / Аналитика / Промо`, using admin-like active styling and responsive wrapping so the main table page gets direct section switching without a separate control row.

# Workbench Authoring

- [x] CAM-WORKBENCH-AUTHORING-VISION - code-first authoring product direction fixed with extraction-first boundaries
- [ ] CAM-WORKBENCH-SOURCE-GRAPH - make `SourceGraph` the primary tree and keep manual annotations fallback-only
- [ ] CAM-WORKBENCH-AUTHORING-MODEL - define `AuthoringNode`, `AuthoringValue`, scopes, and value-source semantics
- [ ] CAM-WORKBENCH-LIVE-PREVIEW - formalize draft-only live preview over the source graph
- [ ] CAM-WORKBENCH-CONSOLIDATION - add explicit token/component/instance settlement before persistence
- [ ] CAM-WORKBENCH-SOURCE-SYNC - generate safe source patches only after source graph and authoring model stabilize
- [ ] CAM-WORKBENCH-HARDENING - extraction readiness, host portability, performance, and regression stabilization
