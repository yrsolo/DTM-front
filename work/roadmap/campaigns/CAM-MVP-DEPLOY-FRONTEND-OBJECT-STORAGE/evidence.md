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
