# Campaign: Versioned Releases - DTM Web Frontend

## Goal (business)
Make each frontend deploy reproducible and traceable by release id.

## Goal (technical)
Add release version id support in deploy scripts and publish release metadata/manifests.

## Non-goals
- Backend/API deploy
- UI redesign
- Release versioning and rollback orchestration

## Definition of Done
1. Deploy scripts accept optional release id.
2. Release metadata file is uploaded for each deploy.
3. Docs explain versioned deploy and rollback approach.
4. Evidence includes one dry-run with release id.
