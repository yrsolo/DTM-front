# Campaign: CDN + Custom Domain - DTM Web Frontend

## Goal (business)
Provide stable public URL on custom domain with better edge delivery characteristics.

## Goal (technical)
Put CDN in front of static website and bind custom domain with HTTPS.

## Non-goals
- Backend/API deploy
- UI redesign
- Release versioning and rollback orchestration

## Definition of Done
1. CDN endpoint serves current frontend content.
2. Custom domain is bound and HTTPS certificate is active.
3. Deploy docs include DNS and certificate runbook.
4. Evidence records endpoint checks and rollback notes.
