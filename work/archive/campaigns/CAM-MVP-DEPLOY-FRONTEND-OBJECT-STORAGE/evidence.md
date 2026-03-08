# Evidence

Campaign ID: `CAM-MVP-DEPLOY-FRONTEND-OBJECT-STORAGE`

## Sources checked
- source: `work/now/CAMPAIGN_mvp_deploy_frontend_object_storage.md`
  last_verified_at: 2026-03-04
  trust_level: owner-input
  evidence: campaign goals, DoD, deployment flow, risks, validation checklist
- source: `docs/ARCHITECTURE.md`
  last_verified_at: 2026-03-04
  trust_level: repository-doc
  evidence: static hosting architecture and frontend boundaries
- source: `docs/API_CONTRACT.md`
  last_verified_at: 2026-03-04
  trust_level: repository-doc
  evidence: API v2 endpoint and query contract

## Decisions
- Runtime config target path standard: `/config/public.yaml`.
- Fallback snapshot target path: `/data/snapshot.example.json`.
- Deploy mechanism for MVP: local script + `aws s3 sync` to Yandex Object Storage website hosting.
- Cache policy:
  - `index.html` -> `no-cache`
  - versioned assets -> `public, max-age=31536000, immutable`

## Results
- Campaign structure prepared and distributed into operational files (`work/now/*`, `work/roadmap/campaigns/*`).
- Execution tasks enumerated for implementation phase.
- Ready to start implementation once owner confirms credentials/environment.

## Validation run (2026-03-04)
- scope: P01-T002, P03-T001, P03-T002, P03-T003
- command:
  - `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_frontend.ps1 -DryRun`
- result:
  - success (`exit code 0`)
  - frontend build completed (`vite build` successful)
  - dry-run printed all upload commands without executing `aws s3 cp/sync`
  - no secrets echoed in output (access keys are not printed)
- cache policy verification:
  - assets sync uses `Cache-Control: public, max-age=31536000, immutable`
  - `index.html` upload uses `Cache-Control: no-cache`
  - `/config/public.yaml` upload uses `Cache-Control: no-cache`
  - `/data/snapshot.example.json` upload uses `Cache-Control: no-cache`
  - confirmed in:
    - `scripts/deploy_frontend.ps1`
    - `scripts/deploy_frontend.sh`
    - `docs/DEPLOY.md`

## Final env list (agreed)
- secrets (not in git):
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- non-secrets (versioned in `scripts/deploy.yaml`):
  - `YC_BUCKET_NAME` (`yc_bucket_name`)
  - `YC_ENDPOINT` (`yc_endpoint`)
  - `AWS_DEFAULT_REGION` (`aws_default_region`)
  - `DTM_WEB_PUBLIC_CONFIG_PATH` (`dtm_web_public_config_path`)
