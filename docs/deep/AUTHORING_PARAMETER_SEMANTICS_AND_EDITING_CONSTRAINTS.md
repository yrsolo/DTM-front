# Authoring Parameter Semantics And Editing Constraints

## Status

Accepted subsystem policy for authoring parameter semantics, validation, and editor selection.

## Purpose

This document fixes how authoring parameters become safe editable values inside the Workbench Authoring product.

It closes one unified seam:

`Authoring Parameter Semantics & Editing Constraints`

After this policy is accepted, implementation should not stop separately on:

- min/max/step/options metadata
- validation and coercion behavior
- enum or token-ref editing
- preview-safe host boundary
- UI editor choice

as long as the implementation stays within this bundle.

## Core principle

Editable parameter meaning must live in canonical descriptor semantics.

It must not be split across:

- ad hoc UI widget logic
- host bridge internals
- raw runtime payload guessing

The browser shell may render editors differently, but the semantic truth comes from canonical authoring descriptors and canonical validation/coercion rules.

## 1. Canonical descriptor semantics

Editable parameters are represented through canonical descriptors.

These descriptors may be discovered automatically, host-enriched, or combined, but the output must remain normalized.

Descriptors should carry semantic constraints where relevant, including:

- `min`
- `max`
- `step`
- `options`
- `unit`
- `nullable`
- editor hints

Hard rule:

> Parameter constraints live in descriptor semantics, not only in UI widgets and not only in the host bridge.

## 2. Validation and coercion pipeline

Raw user input is not automatically preview-safe.

Every raw input must pass through a canonical pipeline:

1. parse
2. validate
3. coerce when allowed
4. produce normalized value or explicit non-happy state

The system must distinguish states such as:

- `valid`
- `invalid`
- `clamped`
- `coerced`
- `unresolved`
- `blocked`

These states are semantic authoring states, not only UI decorations.

### Meanings

- `valid`
  Parsed and accepted without modification.
- `invalid`
  Cannot be accepted in canonical semantics.
- `clamped`
  Was outside the allowed range and was normalized into the allowed range.
- `coerced`
  Was transformed into an accepted canonical representation.
- `unresolved`
  Depends on references or tokens that could not yet be resolved.
- `blocked`
  Editing is intentionally disallowed by policy, capability, or state.

Hard rule:

> The system must never treat raw user text as automatically safe to apply into preview.

## 3. Enum and token-ref editing

The canonical authoring model must support constrained values as first-class semantics.

This includes at least:

- `enum`
- `token-ref`

They must not be downgraded into arbitrary strings just because a text input is easy to render.

Implications:

- enum parameters need canonical options
- token references need canonical reference semantics
- preview and persistence must preserve the semantic kind, not only the displayed string

## 4. Preview-safe host boundary

Only validated and normalized preview-safe values may cross into the host preview bridge.

The generic authoring layer owns:

- parsing
- validation
- coercion
- semantic value-state classification

The host bridge owns:

- project-specific mapping from canonical preview-safe values into runtime channels

Hard rule:

> Generic validation must not be delegated to the host bridge.

If the generic layer cannot produce a preview-safe value, the host bridge must not receive a guessed fallback payload.

## 5. UI editing contract

Right-panel editors are chosen from:

- canonical descriptors
- descriptor constraints
- validation state
- effective preview values
- draft changes

They must not be chosen from:

- raw host control payloads
- ad hoc runtime value inspection
- widget-specific hacks detached from descriptor semantics

Editor choice is therefore semantics-driven.

Examples:

- numeric range descriptor -> number input or slider
- color descriptor -> color editor
- enum descriptor -> select or segmented control
- boolean descriptor -> toggle
- token-ref descriptor -> token picker or reference chooser

## 6. UI state semantics

The right panel must surface semantic editing state, not only raw values.

Relevant UI states include:

- current effective value
- draft value
- validation state
- resolved-from trace
- blocked/unsupported scope state
- stale/unresolved draft state after refresh

This means the UI is not just an input surface; it is an explanation surface for why a value is or is not currently applicable.

## 7. Safety rules

- Do not send invalid or unresolved raw values into the host preview bridge.
- Do not hide coercion or clamping from the user.
- Do not let widget choice redefine parameter semantics.
- Do not collapse enum or token-ref semantics into free text by default.
- Do not let host-specific control internals become the canonical authoring value model.

## Implications for implementation

- descriptor model must grow semantic constraint fields
- draft editing must store or derive validation state, not just raw strings
- effective preview computation must understand normalized values and traces
- editor rendering must become descriptor-driven
- host preview application must accept only preview-safe normalized values

## Related docs

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md](AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md)
- [AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md](AUTHORING_PARAMETER_DISCOVERY_AND_PREVIEW_MAPPING.md)
- [SCOPED_HOST_PREVIEW_APPLICATION.md](SCOPED_HOST_PREVIEW_APPLICATION.md)
