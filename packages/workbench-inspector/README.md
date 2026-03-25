# @dtm/workbench-inspector

Local dev-only contextual inspector foundation package.

## Goals

- stay domain-agnostic
- expose a narrow public API
- remain extractable from the monorepo later

## Non-goals

- production editor
- page builder
- app-specific target logic
- backend persistence

## Host integration

Host applications are expected to provide:

- activation policy
- target registry
- ownership mapping
- workbench bridge actions
