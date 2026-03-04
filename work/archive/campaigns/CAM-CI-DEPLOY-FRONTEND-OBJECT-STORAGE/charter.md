# Campaign charter

Campaign ID: `CAM-CI-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Goal
- Business: reduce manual deploy dependency and make releases repeatable.
- Technical: deploy `apps/web` from GitHub Actions to Yandex Object Storage with safe secret handling.

## Scope
- Add workflow in `.github/workflows/deploy_frontend.yml`.
- Reuse existing deploy scripts from `scripts/`.
- Document GitHub `secrets`/`variables` in `docs/DEPLOY.md`.

## Non-goals
- API/backend deployment.
- CDN migration and custom domain setup.
- Production approval gates beyond repository branch protection.

## Definition of Done
1. Workflow triggers manually and on selected branch pushes.
2. Workflow uses GitHub `secrets` and does not print secret values.
3. Documentation includes full setup and runbook.
4. Evidence records validation and residual risks.

## Risks
- Missing/incorrect repository secrets or vars.
- Deploy from unintended branch.
- Cache headers drift from local deploy behavior.
