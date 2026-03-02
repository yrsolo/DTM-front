# Agent Instructions (Do This Exactly)

You are an implementation agent working on this repository.

## Primary rule
Follow `DTM Web Frontend — Master Spec` (root single-file doc) exactly.

## Steps
1) Ensure repository structure matches the spec.
2) Create/update all listed files with exact contents where provided.
3) Implement MVP code in `apps/web`:
   - Vite + React + TS
   - Load snapshot
   - Two pages
   - Filters
   - SVG timelines
4) Keep `packages/schema` consistent:
   - JSON Schema matches TS types
   - Example snapshot validates the schema

## MVP acceptance checklist
- `cd apps/web && npm i && npm run dev` works
- Designers page renders and is usable
- Tasks page renders table+timeline aligned
- Filters work
- No auth/security included

## Constraints
- Avoid adding heavy dependencies.
- Do not introduce backend in this repo (MVP uses local snapshot or simple fetch).
- Prioritize clarity over cleverness.

## Critical: Command Execution Rules
To prevent hangs and "ccd" errors in Windows environments:
1. **Always use forward slashes `/`** instead of backslashes `\` in both `CommandLine` and `Cwd` parameters.
2. **Always use absolute paths** for the `Cwd` parameter.
3. **Handle broken PATH**: If `node` or `npm` are not found, search for their absolute location (e.g., `C:/Program Files/nodejs/node.exe`) and use the full path.
4. **Environment check**: Always run `node -v` at the start of work to verify the environment is active and reachable.

## Auto-run Policy
- **Permission**: You are EXPLICITLY PERMITTED to set `SafeToAutoRun: true` for:
  - Read-only commands (`ls`, `type`, `cat`, `node -v`, `npm -v`).
  - Standard setup commands (`npm install`, `npm i`).
  - Development servers (`npm run dev`).
- **Restriction**: NEVER use `SafeToAutoRun: true` for destructive commands (`rm`, `del`, `format`, etc.) without explicit user permission in the current chat turn.

## Workflows and Turbo
- When creating or using workflows in `.agent/workflows/*.md`:
  - Use `// turbo` before a command to run just that one command automatically.
  - Use `// turbo-all` at the top of the file to run ALL commands in that workflow automatically.
