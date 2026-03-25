# Authoring Parameter Discovery And Preview Mapping

## Status

Accepted subsystem policy for `Authoring Parameter Discovery & Preview Value Mapping`.

## Purpose

This document fixes the canonical rules for how editable parameters are discovered, represented, resolved, and applied into host-specific preview channels.

It closes the whole seam as one policy bundle so implementation does not need to stop separately on:

- parameter discovery
- generic value model
- host preview mapping
- scope-aware resolution
- UI editing surface

## 1. Canonical parameter discovery

Editable parameters must be represented through canonical parameter descriptors.

Canonical output:

- `AuthoringParameterDescriptor[]`

Hard rules:

- `SourceNode` does not expose editable parameters directly in ad hoc shape
- parameter discovery may be partly automatic and partly host-enriched
- discovery output must always normalize into the same descriptor model
- host-specific control registries are not the canonical descriptor format

## 2. Parameter descriptor model

Each editable parameter must be described through a canonical descriptor shape.

At minimum a descriptor must express:

- stable parameter id
- owning source target id
- parameter label
- parameter group
- canonical value kind
- supported scopes
- optional host metadata

The descriptor is the contract between:

- source graph / authoring layer
- effective value resolver
- right-panel editing surface
- host preview bridge

## 3. Generic value model

The authoring layer must use normalized generic value kinds.

Hard rules:

- the canonical draft/value model must not be arbitrary host payloads
- host-specific objects do not become generic authoring values
- canonical value kinds must be finite and explicit

Examples of acceptable generic value kinds:

- `string`
- `number`
- `boolean`
- `enum`
- `color`
- `length`
- `token-ref`
- `expression`

The exact set may evolve, but it must remain canonical and finite.

## 4. Host preview mapping

Generic authoring parameters and values must be mapped into host-specific runtime channels through a dedicated host bridge.

Hard rules:

- generic layer does not own host-specific control keys
- generic layer does not own CSS variable names
- generic layer does not own recipe internals
- generic layer does not directly mutate host runtime structures as canonical state

The host bridge is responsible for translating:

- parameter descriptor
- effective preview value
- preview scope context

into project-specific runtime application.

## 5. Scope-aware effective value resolution

Effective preview values must be resolved per parameter.

Precedence order remains:

1. `token`
2. `component`
3. `placement`
4. `instance-preview`

Hard rules:

- effective value resolution happens per parameter, not as one opaque merged blob
- effective resolution must produce trace information
- the system must know where the resolved value came from

Expected output includes:

- effective value
- resolved-from scope
- optional source trace metadata
- overridden draft entries when relevant

## 6. UI editing surface contract

The right panel must be built from:

- parameter descriptors
- effective preview values
- draft changes

Hard rules:

- the right panel must not be built from demo-only controls
- the right panel must not be built directly from internal host control structures
- host control structures may enrich the panel only after normalization into canonical descriptors and resolved values

This keeps the UI portable and standalone-product ready.

## 7. Safety rules

- no arbitrary host payload as canonical parameter value
- no host-specific keyspace as authoring core contract
- no scope resolution without explicit precedence
- no panel fields directly mirrored from internal host stores without normalization
- no preview application without descriptor-to-host mapping boundary

If a parameter cannot be reliably normalized, it should remain absent or opaque rather than leaking raw host internals into the canonical authoring layer.

## 8. Relationship to other policies

Read this together with:

- [WORKBENCH_AUTHORING_VISION.md](WORKBENCH_AUTHORING_VISION.md)
- [WORKBENCH_AUTHORING_DECISIONS.md](WORKBENCH_AUTHORING_DECISIONS.md)
- [AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md](AUTHORING_DRAFT_APPLICATION_AND_PREVIEW.md)
- [SOURCE_RUNTIME_BINDING_POLICY.md](SOURCE_RUNTIME_BINDING_POLICY.md)

This policy assumes:

- source graph and source ids are already canonical
- draft preview layer already exists
- runtime projection remains secondary to source identity
