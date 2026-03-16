# Campaign: UI Style Registry and Runtime Theme Overrides

## Context

The frontend currently contains many visually similar UI elements with slightly different parameters. This creates duplication, makes further development harder, and prevents controlled normalization of the design system.

We are introducing a structured UI Style system with the following goals:

- inventory and normalize recurring UI element styles;
- provide a dedicated admin UI tab for inspecting and editing style presets online;
- support shallow inheritance for similar elements;
- allow fast live preview and rollback;
- keep code as the structural source of truth;
- use JSON as a runtime editable override layer;
- later consolidate approved runtime changes back into code in a deterministic way.

This is not a generic visual page builder and not a low-code system. The scope is intentionally narrow: a small set of style parameters per group, strong validation, shallow relationships, deterministic code generation, and safe offline normalization.

---

# Product principles

## We are solving three separate problems

Do not mix these concerns in implementation:

1. **Inventory and visibility**
   - understand what style elements exist;
   - see where they are used;
   - compare similar presets.

2. **Runtime editing**
   - change a limited set of visual parameters in admin UI;
   - preview instantly;
   - rollback quickly.

3. **Normalization**
   - promote successful runtime changes into code;
   - merge near-duplicate presets in a controlled workflow;
   - keep the system maintainable for future feature work.

The system must support all three, but implementation must keep them separated.

---

# Core architecture decision

## Source-of-truth model

Use a layered model:

1. **Code base registry**
   - defines stable preset identities;
   - defines allowed groups;
   - defines allowed parameter schemas per group;
   - defines base preset values.

2. **Runtime JSON overrides**
   - defines editable parent-child links;
   - defines local overrides for a preset;
   - may define limited metadata and workflow state.

3. **Resolved generated layer**
   - deterministic generated TS file based on base registry + runtime JSON;
   - used by the UI at runtime;
   - safe to diff, inspect, and regenerate at any time.

This means:

- structure lives in code;
- experimentation lives in JSON;
- runtime consumption uses resolved generated output;
- approved results are periodically promoted from JSON back into code.

## What must not happen

Do not make JSON the only source of truth for the whole UI system.

If the team starts living only in JSON:
- new features will be built against shifting rules;
- preset identity will become unclear;
- validation and predictability will degrade;
- development will split into “code reality” and “runtime reality”.

---

# Functional scope

## Admin UI entry point

Add a new admin section:

- `Admin -> UI -> Style`

Inside this screen add tabs grouping presets by semantic family. Initial groups:

- `Buttons`
- `Bubbles`
- `Labels`
- `Panels`

The exact route and nesting should follow existing frontend admin patterns.

## Each group screen must provide

- list of presets in the group;
- search/filter by id/title/usage;
- compact preview of each preset;
- short description of intended use;
- places of usage;
- parent selection field;
- limited editable parameter controls;
- computed final values preview;
- diff vs parent;
- quick reset / rollback controls;
- toggle `Hide children`.

## Parent-child rule

Inheritance depth is exactly 1.

Allowed states:

- preset without parent;
- preset with exactly one parent.

Forbidden states:

- parent-of-parent chains;
- cycles;
- child being parent of another preset;
- parent from incompatible group.

Rules:

- child may inherit only from a preset in the same group unless later explicitly extended;
- a preset that already has a parent cannot itself be chosen as parent;
- depth > 1 is invalid and must be blocked in both UI and validation layer.

---

# Data model

## Preset identity

Preset ids are stable and code-owned.

Examples:
- `btn.primary`
- `btn.secondary`
- `bubble.warning`
- `label.sectionTitle`
- `panel.card`

Do not create ids dynamically in runtime JSON without corresponding code registry identity.

## Group model

Use a strict enum-like model for groups.

Example groups:
- `button`
- `bubble`
- `label`
- `panel`

## Base registry shape

Create a hand-written code registry containing stable preset definitions.

Recommended conceptual shape:

- `id`
- `group`
- `title`
- `description`
- `usedIn`
- `props`

Optional:
- `status`
- `deprecated`
- `notes`

## Runtime override shape

Runtime JSON should contain only the mutable layer:

- `parentId`
- `props` overrides only
- limited workflow metadata if needed

Do not duplicate the full base preset content in JSON unless there is a strong technical reason.

## Resolved shape

The resolved generated layer should contain final flattened computed values for runtime usage. It must be deterministic and easy to inspect.

---

# Parameter model

## General rule

Each group must have a small curated set of parameters. Target range:

- **4 to 8 parameters per group**

Do not attempt to expose every possible CSS-like knob.

The system is for normalization of recurring UI presets, not arbitrary styling.

## Group-specific schemas

Define a strict allowed parameter schema per group.

Initial recommendation:

### Buttons
- `height`
- `radius`
- `fontSize`
- `fontWeight`
- `paddingX`
- `variant`
- `borderWidth`

### Bubbles
- `radius`
- `fontSize`
- `fontWeight`
- `paddingX`
- `paddingY`
- `tone`

### Labels
- `fontSize`
- `fontWeight`
- `tone`
- `letterSpacing`
- `uppercase`

### Panels
- `radius`
- `padding`
- `borderWidth`
- `shadowLevel`
- `tone`

These are recommendations; final parameter names should be aligned with current frontend style architecture.

## Parameter typing

Each allowed parameter must have:
- name;
- type;
- default behavior;
- editor control type;
- validation constraints if relevant.

Examples:
- numeric integer;
- numeric constrained;
- enum;
- boolean.

## Do not expose raw arbitrary CSS

Avoid:
- freeform CSS strings;
- arbitrary color values if the project already uses semantic tones;
- arbitrary box-shadow strings;
- arbitrary typography blobs.

Prefer semantic enum-like values when possible.

---

# Workflow model

## Online editing workflow

The admin editing workflow should be:

1. open UI Style page;
2. choose group;
3. inspect presets;
4. edit small set of parameters for a preset;
5. see live preview immediately;
6. compare with parent / base;
7. rollback if not good;
8. keep editing until acceptable;
9. export resulting runtime state to JSON.

## Offline normalization workflow

After successful runtime experimentation:

1. export runtime JSON;
2. commit or place JSON into local workflow input;
3. run deterministic code generation;
4. inspect generated diff;
5. optionally promote approved values into base registry code;
6. clean up redundant overrides;
7. commit normalized state.

This “promote to base” step is not required every time, but must happen periodically.

---

# Merge and normalization policy

## Distinguish inheritance from merge

Parent-child linkage is a styling relationship.

It is **not** automatically a structural merge.

Example:
- `btn.taskAction` may inherit from `btn.primary`;
- this does not mean the project should immediately replace all `btn.taskAction` usages with `btn.primary`.

## Merge must be treated as a separate operation

A future merge operation may exist, but should be implemented later and separately from the first version.

The first phase should support:
- inventory;
- parent-child override;
- preview;
- export;
- generation;
- promotion to base.

Do not implement automatic “replace all instances with parent” in the first delivery unless explicitly required later.

Reason:
- style equality does not always imply semantic equality;
- mass replacement belongs to refactoring workflow, not styling workflow.

---

# Validation rules

Validation must exist in three places where reasonable:

1. UI form level
2. runtime data parse level
3. generation/build step

## Mandatory validation rules

### Identity and existence
- referenced preset id must exist in code registry;
- parentId must reference an existing preset;
- preset and parent must belong to same compatible group.

### Relationship rules
- no cycles;
- max depth = 1;
- child cannot be parent of another preset;
- preset cannot parent itself.

### Schema rules
- props must match allowed schema for its group;
- unknown props are invalid;
- invalid enum values are invalid;
- invalid numeric ranges are invalid.

### Runtime safety
- invalid JSON must not silently corrupt the whole style system;
- fallback behavior must be defined;
- validation errors should be visible and actionable.

## Failure behavior

Preferred behavior:
- invalid preset override is rejected or isolated;
- valid presets continue working;
- admin UI shows precise error;
- generation command fails loudly for invalid state.

Do not silently coerce broken data into something vague.

---

# Frontend code structure campaign

## Goal

Introduce the minimal technical foundation required for:
- stable registry;
- typed schemas;
- runtime overrides;
- resolved generation;
- admin editing UI;
- live preview.

## Tasks

### 1. Create UI style domain module

Add a dedicated module, naming aligned with repository conventions. Suggested conceptual location:

- `src/shared/ui-style/`

Expected responsibilities:
- base registry definitions;
- group schemas;
- runtime override types;
- validation utilities;
- resolve logic;
- preview helpers;
- export/import helpers.

### 2. Define strict types

Create TS types for:
- group ids;
- preset ids;
- group-specific prop schemas;
- base preset model;
- runtime override model;
- resolved preset model;
- workflow state markers if needed.

Use discriminated unions or equivalent strong typing patterns. Avoid loose `Record<string, any>` in public domain types.

### 3. Create base registry file

Add a hand-maintained registry file containing existing normalized presets.

This is the structural source layer.

Keep it readable and curated. Do not auto-generate this file.

### 4. Create schema definition per group

Add a strongly typed definition of editable params per group.

Each param definition should include:
- label;
- type;
- constraints;
- control metadata if helpful for admin UI.

This schema should drive:
- validation;
- rendering of controls;
- diff logic;
- export hygiene.

### 5. Implement resolve algorithm

Implement deterministic resolver:

- start from base preset props;
- if no parent: apply local override props;
- if parent exists:
  - resolve parent base props;
  - apply child override props only;
- return flattened computed props.

Depth must be enforced to 1.

### 6. Implement validation utilities

Add utilities to validate:
- base registry consistency;
- runtime JSON consistency;
- parent-child constraints;
- prop schemas.

These validators must be reusable by both runtime app layer and offline generator.

### 7. Add generated resolved file pipeline

Introduce a generated file, example conceptual name:

- `ui-style.resolved.gen.ts`

It should be produced deterministically from:
- base registry;
- runtime JSON input.

This generated file should be runtime-consumable and stable in formatting.

### 8. Switch consumers to resolved access layer

UI components should read style presets via a dedicated accessor layer, not by directly scraping JSON or partially hardcoding duplicate values.

The accessor layer should provide:
- `getButtonStylePreset(id)`
- `getBubbleStylePreset(id)`
- etc., or a unified group-aware accessor.

Do not spread style resolve logic across components.

---

# Admin UI campaign

## Goal

Deliver a dedicated admin interface for inspecting and editing style presets live.

## Tasks

### 1. Add admin route and page shell

Create the new `UI / Style` admin page following existing route and layout patterns.

### 2. Add group tabs

Tabs:
- Buttons
- Bubbles
- Labels
- Panels

Each tab loads only relevant presets and controls.

### 3. Add preset list panel

Each preset item/card should display:
- preview;
- id;
- title;
- description;
- usage references;
- parent status;
- local-vs-computed status marker.

### 4. Add preset detail/editor panel

When a preset is selected show:
- current parent field;
- computed props;
- override props;
- diff vs parent;
- controls for all editable params in its group.

### 5. Add parent selector UX

Requirements:
- show only valid same-group parent candidates;
- exclude self;
- exclude presets that already have a parent;
- exclude any candidate that would violate depth rules;
- show warning if assigning a parent will hide some local differences semantically.

### 6. Add `Hide children` toggle

When enabled:
- in list view, hide presets that currently inherit from another preset.

This is for focused browsing and normalization work.

### 7. Add quick rollback/reset actions

Minimum actions:
- reset changed field;
- clear all local overrides;
- remove parent;
- restore saved runtime state if unsaved preview changed.

### 8. Add live preview integration

All edits must apply to preview immediately without requiring page reload.

Live preview should be fast and local to the admin session or draft state mechanism.

### 9. Add draft/export actions

Minimum:
- export current runtime style state to JSON;
- optionally import JSON locally if supported in admin workflow;
- show dirty state indicator.

---

# Preview and safety campaign

## Goal

Make runtime editing useful in practice and safe during exploration.

## Tasks

### 1. Draft state isolation

Edits during admin session should first live in a local working state.

The user must be able to:
- experiment;
- see preview;
- discard;
- save/export intentionally.

Do not instantly make every keystroke a permanent canonical change without a draft concept.

### 2. Stable live preview application

Preview application should:
- update only relevant style consumers if possible;
- not trigger broad unnecessary app instability;
- preserve app responsiveness.

### 3. Clear dirty/changed indicators

Show:
- which presets changed;
- which fields changed;
- whether current draft differs from saved runtime state;
- whether saved runtime state differs from code base.

### 4. Explicit invalid-state messaging

When a change is invalid:
- explain why clearly;
- prevent invalid save/export;
- keep working state recoverable.

---

# Runtime JSON storage campaign

## Goal

Define where editable runtime style state lives and how it is persisted.

## Decision recommendation

Phase 1 recommendation:
- persist runtime style state as JSON in backend-managed storage or existing admin config storage mechanism;
- frontend loads it in admin and resolve pipeline contexts;
- export must still be available.

Exact persistence transport depends on current project infrastructure.

## Tasks

### 1. Define persisted JSON schema

Versioned schema required:
- include top-level `version`;
- include override map;
- optional workflow metadata fields if justified.

### 2. Add fetch/save integration

Frontend admin page must support:
- fetch current saved runtime config;
- edit in draft;
- save current runtime config;
- export runtime config JSON.

### 3. Add fallback behavior

If runtime JSON is missing:
- use empty overrides;
- rely entirely on base registry.

### 4. Add version guards

Future-proof with top-level version field and clear upgrade path.

---

# Deterministic generation campaign

## Goal

Create a reliable offline mechanism that turns runtime JSON + base registry into generated runtime-consumable code.

## This is mandatory

Do not make “ask agent to manually apply JSON to code” the primary workflow.

Agent help is acceptable around the system, but the actual translation must be deterministic.

## Tasks

### 1. Add generation script

Introduce a script command aligned with repo tooling. Example conceptual commands:

- `pnpm ui-style:generate`
- `pnpm ui-style:validate`
- `pnpm ui-style:print-diff`

Exact naming should follow existing repository style.

### 2. Script inputs

Generation script should read:
- base registry module;
- runtime JSON file or fetched exported artifact.

### 3. Script outputs

Generate:
- resolved preset map TS module;
- optional report output;
- optional normalized JSON output if useful.

Do not auto-rewrite the hand-maintained base registry in this step.

### 4. Deterministic formatting

Output must be stable:
- sorted keys where appropriate;
- consistent formatting;
- no nondeterministic ordering;
- easy git diff.

### 5. Build failure on invalid data

If validation fails:
- generation command must fail;
- output must not partially update silently.

---

# Promotion-to-base campaign

## Goal

Support periodic normalization where successful runtime overrides become part of the hand-maintained base registry.

## Important principle

This is a controlled maintenance workflow, not something that must happen on every edit.

## Tasks

### 1. Define promotion criteria

A preset override should be considered for promotion when:
- it has proven stable across iterations;
- it represents a new normal rather than an experiment;
- it is not a temporary one-off case.

### 2. Manual or assisted base update

Promotion may be:
- manual by developer;
- assisted by agent;
- supported later by tooling.

But the promoted result must remain human-reviewed and committed into the base registry.

### 3. Override cleanup after promotion

After promotion:
- remove redundant runtime overrides that now match base values;
- preserve only still-meaningful differences;
- ensure generated resolved output remains unchanged after cleanup.

### 4. Add optional normalization report

Helpful optional output:
- overrides identical to base;
- child presets with zero effective difference from parent;
- candidates for cleanup;
- candidates for semantic review.

---

# Usage mapping campaign

## Goal

Help humans understand whether a preset is safe to normalize.

## Tasks

### 1. Add usage metadata in registry

Each base preset should include `usedIn` or equivalent descriptive usage data.

This can start as hand-maintained if automatic discovery is too heavy.

### 2. Show usage in admin UI

For each preset show:
- major screens/modules/components where used;
- approximate usage count if available.

### 3. Keep usage data lightweight

Do not block first version on perfect static analysis. Hand-maintained references are acceptable initially if consistent.

---

# Testing campaign

## Goal

Guarantee stability of resolve logic, validation, generation, and admin editing behavior.

## Tasks

### 1. Unit tests for resolve logic

Cover:
- standalone preset;
- child with parent;
- override precedence;
- empty overrides;
- invalid parent;
- forbidden depth > 1.

### 2. Unit tests for validation

Cover:
- unknown props;
- wrong group parent;
- cycle attempts;
- self-parent;
- child-as-parent rejection;
- invalid enum values;
- invalid numeric values.

### 3. Snapshot tests for generation

Given known base registry + runtime JSON, generated resolved output should match snapshots or equivalent stable assertions.

### 4. UI tests for admin editor

Cover:
- group tab rendering;
- parent selection restrictions;
- hide children toggle;
- live preview draft behavior;
- rollback/reset controls;
- export action visibility.

### 5. Regression tests for runtime consumption

Ensure components reading resolved presets behave correctly after integration.

---

# Non-goals for first implementation

The following are explicitly out of scope unless later requested:

- arbitrary CSS editor;
- deep inheritance trees;
- automatic semantic merge of preset identities;
- full visual page builder;
- general-purpose design token system for every UI concern;
- automatic code rewriting of all handwritten components;
- AI-driven primary transformation from JSON to code.

Keep first delivery focused.

---

# Suggested implementation phases

## Phase 1 — Domain foundation
Deliver:
- base registry module;
- group schemas;
- runtime override schema;
- validation layer;
- resolve logic;
- generated resolved output pipeline.

Exit criteria:
- deterministic generation works;
- tests exist;
- runtime consumers can read resolved presets.

## Phase 2 — Admin read-only inventory
Deliver:
- admin route;
- group tabs;
- preset list;
- preview cards;
- usage info;
- computed prop display.

Exit criteria:
- team can browse and inspect presets centrally.

## Phase 3 — Admin editing and live preview
Deliver:
- parent selector;
- override controls;
- draft editing;
- hide children toggle;
- rollback/reset controls;
- runtime JSON save/export.

Exit criteria:
- admin can safely experiment and preview live changes.

## Phase 4 — Offline normalization workflow
Deliver:
- documented export -> generate workflow;
- promotion-to-base guidance;
- cleanup report or helper tooling.

Exit criteria:
- successful runtime changes can be consistently absorbed into code base.

## Phase 5 — Optional future normalization tooling
Future only, not required now:
- duplicate detection report;
- candidate merge report;
- semantic refactor assistant;
- richer usage discovery.

---

# Engineering constraints

## Keep access centralized

All preset reading must go through a shared access layer. Avoid per-component ad hoc resolve logic.

## Keep schemas strict

Unknown keys and ambiguous values should fail validation.

## Keep performance acceptable

Resolve work should be cheap. Prefer precomputed/generated resolved maps for runtime consumption.

## Keep UX practical

Admin screen is a tool for humans doing normalization work. It should be:
- predictable;
- fast;
- reversible;
- clear about what is base vs override vs computed.

## Keep generated code disposable

Generated files must be reproducible from source inputs. No manual edits inside generated files.

---

# Deliverables checklist

## Domain layer
- [ ] base registry module
- [ ] group parameter schemas
- [ ] override types
- [ ] resolved types
- [ ] validation utilities
- [ ] resolve algorithm

## Generation
- [ ] generation command
- [ ] validation command
- [ ] generated resolved TS file
- [ ] stable output formatting

## Admin UI
- [ ] UI / Style page
- [ ] group tabs
- [ ] preset list
- [ ] preset detail editor
- [ ] parent selector
- [ ] hide children toggle
- [ ] live preview
- [ ] reset/rollback
- [ ] export JSON
- [ ] save runtime config

## Integration
- [ ] components switched to resolved access layer
- [ ] fallback behavior without runtime overrides
- [ ] error handling for invalid config

## Testing
- [ ] resolve tests
- [ ] validation tests
- [ ] generation tests
- [ ] admin UI tests
- [ ] regression coverage

## Documentation
- [ ] developer workflow doc
- [ ] admin usage doc
- [ ] promotion-to-base workflow doc

---

# Developer workflow

## Daily online workflow
1. open admin UI Style page;
2. inspect presets;
3. create or adjust parent-child links where valid;
4. tweak small allowed parameter set;
5. preview instantly;
6. rollback if needed;
7. save/export runtime JSON when satisfied.

## Periodic normalization workflow
1. export current approved runtime JSON;
2. run local validation;
3. run deterministic generation;
4. inspect git diff of generated output;
5. decide which changes should be promoted into base registry;
6. update base registry;
7. remove redundant overrides;
8. regenerate and verify no unintended change;
9. commit.

---

# Final acceptance criteria

The feature is considered successfully implemented when all of the following are true:

- there is a dedicated admin UI Style section with group tabs;
- presets can be inspected centrally with preview and usage info;
- each group has a strict small editable parameter schema;
- parent-child linkage exists with max depth 1 and strict validation;
- live preview works with fast rollback;
- runtime changes can be exported as JSON;
- base code registry remains the structural source of truth;
- deterministic generation produces resolved runtime-consumable code;
- the team can periodically promote stable runtime changes back into code;
- the system reduces UI duplication without turning into a general-purpose visual builder.

---

# Implementation notes for the agent

- Follow existing frontend repository work-process conventions for campaigns, module layout, and task decomposition.
- Prefer minimal invasive integration over broad refactor-at-once.
- Keep identifiers stable and human-readable.
- Keep generation deterministic.
- Keep validation strict.
- Keep first delivery focused on normalization workflow, not full design tooling.
- If an implementation choice conflicts with these principles, prefer simplicity, predictability, and reversible workflow.