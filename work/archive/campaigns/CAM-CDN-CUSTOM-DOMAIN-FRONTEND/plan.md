# Campaign plan

Campaign ID: `CAM-CDN-CUSTOM-DOMAIN-FRONTEND`

## Phases
### P01 Discovery
- T001 Define required inputs:
  - domain name
  - DNS zone provider access
  - certificate strategy (managed/imported)
  - CDN product target (Yandex CDN or equivalent)
  - origin endpoint (current Object Storage website URL)
- T002 Collect actual values from owner.

### P02 Implementation
- T001 Add step-by-step runbook for CDN + custom domain to `docs/DEPLOY.md` (or dedicated doc).
- T002 Add optional helper commands/templates for DNS/certificate verification.

### P03 Validation
- T001 Validate:
  - CDN endpoint serves app
  - custom domain serves app
  - HTTPS certificate is valid
  - `/config/public.yaml` and `/data/snapshot.example.json` are still accessible
- T002 Record evidence and rollout checklist.
