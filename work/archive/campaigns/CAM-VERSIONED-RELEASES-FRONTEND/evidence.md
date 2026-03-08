# Evidence

Campaign ID: `CAM-VERSIONED-RELEASES-FRONTEND`

## Sources checked
- `scripts/deploy_frontend.ps1`
- `scripts/deploy_frontend.sh`
- `docs/DEPLOY.md`

## Results
- added release-id support:
  - `scripts/deploy_frontend.ps1 -ReleaseId <id>`
  - `scripts/deploy_frontend.sh --release-id <id>`
- added release metadata publishing:
  - `releases/<release-id>/release.json`
  - `releases/latest.json`
- updated docs with release-id usage and metadata paths in `docs/DEPLOY.md`
- updated CI workflow `.github/workflows/deploy_frontend.yml`:
  - `push dev` -> dry-run deploy
  - `push main` -> automatic release deploy
  - `workflow_dispatch` supports optional `release_id`
- owner confirmed rollback expectation is acceptable:
  - rollback by re-deploying selected `release_id` from corresponding revision

## Validation run (2026-03-04)
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_frontend.ps1 -DryRun -ReleaseId 20260304-r1` -> success
  - confirmed dry-run prints:
    - `releases/20260304-r1/release.json`
    - `releases/latest.json`
- `bash -n scripts/deploy_frontend.sh` -> success
- `bash scripts/deploy_frontend.sh --dry-run --release-id 20260304-r1` -> failed in local environment (`node` not found in bash PATH on this machine)
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_frontend.ps1 -DryRun -ReleaseId 20260304-r2` -> success

## Usability update
- `scripts/deploy_frontend.cmd` now supports combined args:
  - `--dry-run`
  - `--release-id <id>`

## Final DoD checklist
- [x] release-id supported in local scripts
- [x] release metadata uploaded (`releases/<id>/release.json`, `releases/latest.json`)
- [x] CI auto-release configured for `main`
- [x] rollback baseline agreed with owner
