# Campaign plan

Campaign ID: `CAM-VERSIONED-RELEASES-FRONTEND`

## Phases
### P01 Discovery
- T001 Define release id format and bucket layout.
- T002 Confirm rollback expectations with owner.

### P02 Implementation
- T001 Add `ReleaseId` support to `scripts/deploy_frontend.ps1`.
- T002 Add `RELEASE_ID` support to `scripts/deploy_frontend.sh`.
- T003 Upload release metadata:
  - `releases/<id>/release.json`
  - `releases/latest.json`
- T004 Update `docs/DEPLOY.md` with versioned deploy usage.

### P03 Validation
- T001 Run dry-run with explicit release id and verify printed paths.
- T002 Record evidence and update tracking.
