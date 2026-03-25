```md
# Clarification for agent: persistence targets, repeated elements, and placement-level editing

## Purpose

This note clarifies a critical architectural point for the Workbench Authoring System:

**repeated runtime instances inside loops are not the primary persistence target.**

The main use case is different:

- repeated elements produced by loops/lists should usually be edited **together**;
- local fine-tuning is primarily needed not for loop instances, but for **the same reusable component used in different source contexts**.

This clarification changes how `SourceGraph`, `AuthoringNode`, and `Source Sync` should be designed.

---

## Core clarification

The system does **not** need to support persistent per-instance editing for every repeated runtime element.

Example of what is **not** the main goal:
- editing the 17th row in a repeated list as a separate source-level object;
- persisting unique source changes for a single item inside a render loop;
- treating every runtime repetition as its own independent authoring unit.

Instead, the main goal is:

### Goal A — edit repeated structures together
If an element exists because of a loop/list/repeated template, then in most cases it should be edited as a **shared pattern**, not as a unique source target.

Examples:
- all rows of a table;
- all repeated badges in a list;
- all repeated task cards generated from the same JSX pattern.

### Goal B — edit the same reusable component differently in different contexts
If the same component is used in multiple places of the app, it must be possible to:
- edit the component globally;
- or edit a specific **usage/placement** of that component in one source context.

Example:
- several buttons are all instances of the same `Button` component;
- but in one modal a button needs a slightly different position or tint;
- in another panel the same base component needs a local adjustment.

This means the key architectural distinction is not:
- repeated item vs non-repeated item

but rather:

- **component definition**
- **component placement / usage context**
- **runtime repeated projection**

---

## The new persistence model

The authoring and sync architecture should focus on three different kinds of entities.

---

## 1. ComponentDefinitionNode

This is the reusable component itself.

It represents:
- the shared component type;
- its defaults;
- its shared visual recipe;
- values that should affect all usages of that component.

### Examples
- `Button`
- `StatusBadge`
- `TaskRow`
- `PanelCard`

### Editing at this level means
“Change the component generally.”

### Effects
All usages of that component should change, except where a more specific placement override exists.

### Typical editable properties
- default radius
- typography role
- border style
- default shadow
- inner spacing
- icon spacing
- shared color bindings

---

## 2. PlacementNode

This is a specific usage of a component in a specific source context.

This is the **main unit** for local contextual tuning.

It represents:
- where a component is placed in the source tree;
- in which parent component it is used;
- in which slot or structural position it appears;
- what local contextual overrides apply there.

### Examples
- `SettingsModal.footer.saveButton`
- `TaskDrawer.header.closeButton`
- `TimelineToolbar.filters.applyButton`

### Editing at this level means
“Keep the base component, but tune this specific placement.”

### Effects
Only this usage changes, not every instance of the component across the app.

### Typical editable properties
- local offset
- local color emphasis
- local alignment
- local width preset
- local spacing against siblings
- contextual visibility
- local emphasis style

This is the correct level for use cases like:

> “The same button component is used in different windows, but in one place it should be moved slightly or tinted differently.”

---

## 3. RepeatedProjectionGroup

This represents repeated runtime projections of the same source template/placement.

This is **not** the primary persistence target.

It represents:
- a repeated source pattern;
- a set of runtime instances produced from it;
- the fact that the user clicked one visible instance, but editing should usually affect the shared pattern.

### Examples
- rows of `TaskRow` inside a mapped list
- repeated badges rendered inside each row
- repeated cards rendered from the same JSX fragment

### Editing at this level means
Usually **do not** persist per-instance changes.
Instead:
- resolve the clicked runtime instance to its shared source placement/template;
- edit the shared pattern;
- preview on actual runtime instances.

### Important rule
RepeatedProjectionGroup exists primarily for:
- runtime selection
- preview
- explanation
- grouping
- shared editing resolution

It should **not** normally become a separate persistent source identity for each repeated runtime item.

---

## Why this matters

This clarification resolves the earlier concern about stable identity for loops.

The earlier problem was:

- one JSX source location may render many runtime instances;
- runtime index/path can change under loops, conditionals, and refactors;
- therefore runtime instance identity is not reliable enough for safe `Persist`.

That problem is real, but its impact is now reduced, because:

### We do not need to persist every repeated runtime item individually
Instead, we need stable persistence targets mainly for:

- `ComponentDefinitionNode`
- `PlacementNode`

Repeated runtime items can usually be treated as:
- projections of a shared source pattern,
- not independent source-level editing units.

This makes the architecture much more realistic and stable.

---

## Canonical persistence targets

The system should treat the following as canonical persistence targets:

### Primary
- `ComponentDefinitionNode`
- `PlacementNode`

### Secondary / optional
- named stable source instances outside of loops, if such a concept exists

### Not primary
- arbitrary repeated runtime instances inside lists/loops

---

## Consequences for Source Graph design

The `SourceGraph` should not be designed as a graph of:
- DOM nodes
- runtime elements
- every repeated visual item separately

Instead, it should be designed as a graph of:
- component definitions
- placements/usages
- repeated projection groups where needed

This means the graph becomes much closer to how a designer or UI author actually thinks.

### Example

Instead of this mental model:

- 100 concrete buttons on screen

the graph should look more like:

- `SettingsModal`
  - `Footer`
    - `Button (placement: save)`
    - `Button (placement: cancel)`

and for repeated structures:

- `TaskList`
  - `TaskRow [repeated]`
    - `StatusBadge [repeated slot]`
    - `ActionButton [repeated slot]`

This is much more useful than treating every runtime item as its own persistent unit.

---

## Consequences for runtime click behavior

When the user clicks on a repeated element on the page:

### The system should not assume
“I will persist a change for exactly this runtime instance.”

### The system should do
1. detect the clicked runtime instance;
2. resolve it to:
   - its `RepeatedProjectionGroup`
   - and then to the underlying `PlacementNode` / template;
3. explain to the user that this is a repeated element;
4. apply editing to the shared source target.

### Expected UX
The UI should be able to say something like:

- “You selected an instance of a repeated element.”
- “Edits here will apply to the shared pattern.”
- “Per-instance source persistence for repeated loop items is not supported by design.”

That is a feature, not a limitation.

---

## Consequences for reusable components in multiple contexts

For reusable components used in different contexts, the system should support a clear split:

### Edit component definition
Affects all usages.

### Edit this placement only
Affects only the selected source usage context.

This is the core user workflow that matters most.

### Example
If the user selects a button used in one modal:

The panel should offer something like:
- `Edit Button component`
- `Edit this placement only`

This is the correct behavior for contextual tuning.

---

## Required architectural distinction

The system must distinguish these levels explicitly.

### Level 1 — component definition
Shared reusable component.

### Level 2 — placement / usage
A specific use of that component in a specific source location.

### Level 3 — repeated runtime projection
A currently rendered repeated instance or group of instances.

These levels must not be collapsed into one generic “node”.

---

## Recommended models

The following concepts should be introduced explicitly in the architecture.

### `ComponentDefinitionNode`
Represents:
- reusable component type
- shared defaults
- shared visual recipe
- global editable surface

### `PlacementNode`
Represents:
- one source usage of a component
- its parent context
- its local overrides
- its layout context
- its stable source-level persistence identity

### `RepeatedProjectionGroup`
Represents:
- repeated runtime outputs of one source placement/template
- selection and preview grouping
- explanation of shared editing semantics

---

## Practical implications for persistence

`Source Sync` should mainly target:

### 1. Component-level apply
Write changes into the reusable component definition / recipe.

### 2. Placement-level apply
Write changes into the specific source usage / contextual override location.

### 3. Not default behavior
Do not attempt to write separate persistent source changes for arbitrary repeated runtime instances in loops.

This should drastically simplify the sync pipeline.

---

## Practical implications for stable identity

Stable identity is still required, but the hardest part becomes narrower.

We primarily need stable identities for:
- component definitions
- placement nodes

We do **not** need equally strong persistent identities for every repeated loop instance.

This means the source analysis and sync strategy can be optimized around:
- structural source usage
- reusable component boundaries
- usage/placement paths

rather than trying to fully stabilize every render repetition.

---

## Design rule for the right panel

The authoring panel should reflect these scopes clearly.

For a selected element, the user should be able to see and choose:

### Scope options
- `Component`
- `Placement`
- `Repeated pattern` (informational/shared)
- `Runtime instance` (preview/debug only, usually non-persistent)

### Important default
For repeated loop items, the default editable target should resolve upward to:
- the repeated pattern,
- the placement,
- or the component definition.

Not to the concrete runtime copy itself.

---

## Final architectural directive

The Workbench Authoring System should be designed around this principle:

> We do not aim to persist edits for every visible runtime instance.  
> We mainly aim to persist edits for shared component definitions and for specific source placements/usages.

Repeated list/loop items should generally be:
- selected through runtime projection,
- understood as repeated,
- edited as a shared pattern,
- persisted at the component or placement level.

This is the intended system behavior.

---

## What this changes in implementation priority

The architecture should now prioritize:

1. building stable source identities for component definitions;
2. building stable source identities for placements/usages;
3. resolving repeated runtime items to shared source targets;
4. keeping repeated instances as grouped projections, not primary persistence units.

This should be reflected in:
- source graph design,
- authoring model,
- selection behavior,
- sync pipeline,
- panel UX.

---

## Direct instruction

Please update the architecture and implementation planning so that:

- repeated runtime items in loops are **not treated as primary persistent editing units**;
- the main persistent targets become:
  - `ComponentDefinitionNode`
  - `PlacementNode`
- repeated elements are resolved to shared source-level editing targets;
- contextual tuning for reusable components in different places is treated as a first-class use case.
```
