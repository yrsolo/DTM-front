# AGENTS.md

Operational rules for AI agents working in this repository.

> Primary runtime control document: `agent/OPERATING_CONTRACT.md`.

## Start Gate (mandatory)
Every agent session must start with:
1) read `agent/OPERATING_CONTRACT.md`
2) read `AGENTS.md`
3) confirm: `CONTRACT CHECK: OK`

If missing, execution/planning must not continue.

## Scope
- Applies to the whole repository unless overridden by a deeper `AGENTS.md`.
- Owner instruction in chat overrides this file.

## Working mode
- Default working branch: `dev`.
- Never push/merge to `main` without explicit owner approval.
- Keep changes small, reversible, testable.
- Do not delete or move large folders without explicit owner approval.

## Tracking
- Jira is preferred but not required.
- If Jira is not used, keep local tracking:
  - `work/now/tasks.md`
  - `work/roadmap/README.md`
  - `work/roadmap/campaigns/<CAM>/{charter,plan,evidence}.md`

## Penpot MCP workflow
- For local Penpot work, prefer repo tooling over Codex built-in MCP integration.
- Use:
  - `npm run penpot:tools`
  - `npm run penpot:selection`
  - `node scripts/penpot_cli.mjs execute-code --code "..."`
  - `node scripts/penpot_cli.mjs page-structure --max-depth 3`
  - `node scripts/penpot_cli.mjs find-shapes --name "<NAME>"`
- Primary entrypoint: `scripts/penpot_cli.mjs`
- Supporting client/config:
  - `scripts/penpot_mcp_client.mjs`
  - `scripts/penpot_config.mjs`
- Reference docs: `docs/deep/PENPOT_MCP.md`
- Assumption: local Penpot MCP server is tools-only; do not depend on MCP resources discovery.
- The Penpot MCP plugin UI must stay open in Penpot while commands are running.
- If Codex built-in MCP calls time out, do not spend time re-debugging that first; use the repo CLI path unless the owner explicitly asks for MCP client diagnostics.

## Quality gate before commit
- No secret leaks.
- `npm test` / `npm run build` (or relevant) passes for changed areas.
- Docs updated when behavior/config/process changes.

## Clean architecture rules (frontend edition)
1) **No env access deep in code**
   - env reading only in one config module (e.g. `apps/web/src/config/*`).
2) **Thin app entry**
   - routing and composition in one place (`src/app/*`), not scattered.
3) **Stable data boundary**
   - UI consumes a normalized `SnapshotV1` shape (from `packages/schema`).
   - normalization lives in `apps/web/src/data/normalize.ts`.
4) **Avoid heavy dependencies** (MVP).
5) **No backend** in this repo (frontend only).
