# Evidence

Campaign ID: `CAM-CI-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Sources checked
- source: `scripts/deploy_frontend.ps1`
  last_verified_at: 2026-03-04
  trust_level: repository-code
  evidence: existing deploy logic and cache policy to reuse in CI
- source: `docs/DEPLOY.md`
  last_verified_at: 2026-03-04
  trust_level: repository-doc
  evidence: current local deploy runbook

## Results
- workflow added: `.github/workflows/deploy_frontend.yml`
- docs updated: `docs/DEPLOY.md` (CI setup + runbook)
- local deploy parity preserved via `scripts/deploy_frontend.sh`

## Validation run (2026-03-04)
- `bash -n scripts/deploy_frontend.sh` -> success
- `npm run build` in `apps/web` -> success
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_frontend.ps1 -DryRun` -> success

## Security checks
- secrets are read from GitHub `secrets` only
- workflow logs do not print secret values
- dry-run path allows verification before real upload

## Residual risks
- first real CI deploy still depends on correct repository variables/secrets configuration
