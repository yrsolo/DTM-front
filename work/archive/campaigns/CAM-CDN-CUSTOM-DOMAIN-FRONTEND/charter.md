# Campaign charter

Campaign ID: `CAM-CDN-CUSTOM-DOMAIN-FRONTEND`

## Goal
- Business: stable branded URL for frontend and better user-perceived performance.
- Technical: serve static frontend via CDN and custom domain with HTTPS.

## Scope
- CDN setup and binding to current static website endpoint.
- Custom domain + TLS certificate activation.
- Deploy runbook updates in docs.

## Non-goals
- Backend API changes.
- Migration away from Object Storage as origin.
- Full release management/rollback automation.

## Definition of Done
1. CDN endpoint serves current frontend.
2. Custom domain resolves and serves same content over HTTPS.
3. Deploy docs include DNS/certificate checklist.
4. Evidence records endpoint validation.

## Risks
- DNS propagation delays.
- Certificate validation delays/failures.
- Wrong origin or host header settings causing 403/404.
