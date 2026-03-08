# Campaign charter

Campaign ID: `CAM-VERSIONED-RELEASES-FRONTEND`

## Goal
- Business: predictable frontend rollouts with traceable release ids.
- Technical: publish release metadata and keep reversible deploy flow.

## Scope
- Extend deploy scripts with optional release id.
- Upload release metadata objects to bucket.
- Update deploy docs with versioned release runbook and rollback basics.

## Non-goals
- Full blue/green environment orchestration.
- Backend release coordination.
- Automated rollback trigger system.

## Definition of Done
1. Deploy scripts support explicit release id.
2. `releases/<id>/release.json` and `releases/latest.json` are uploaded (or printed in dry-run).
3. Deploy docs describe release-id usage and rollback pattern.
4. Evidence contains dry-run validation with explicit release id.
