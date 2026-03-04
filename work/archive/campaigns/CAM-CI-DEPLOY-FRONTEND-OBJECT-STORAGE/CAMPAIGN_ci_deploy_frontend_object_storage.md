# Campaign: CI Deploy Contour - DTM Web Frontend (Object Storage)

## Goal (business)
Make frontend deploy repeatable from GitHub without a local operator workstation.

## Goal (technical)
Add a GitHub Actions workflow that deploys `apps/web` to Yandex Object Storage with the same cache policy as local scripts.

## Non-goals
- Backend/API deploy
- CDN/custom domain switch
- Release versioning and rollback orchestration

## Definition of Done
1. Workflow exists in `.github/workflows/deploy_frontend.yml`.
2. Required GitHub `secrets` and `variables` are documented.
3. Workflow supports `workflow_dispatch` and runs deploy script.
4. Evidence contains validation output and security notes (no secret output).
