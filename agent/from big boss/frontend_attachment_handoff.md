# Frontend Attachment Handoff

This document is the current frontend integration handoff for task attachments.

## Confidence level

What is confirmed right now:
- `test` contour is verified end-to-end through backend-owned `/info` attachment harness
- confirmed path:
  1. `request-upload`
  2. direct browser `PUT` to Object Storage presigned URL
  3. `finalize`
  4. async worker `attach_task_file`
  5. attachment publication into snapshot/API
  6. `view`
  7. `download`
  8. `delete`
  9. async worker `delete_task_attachment`
  10. attachment disappearance from snapshot/API

What is not yet guaranteed by the same live evidence:
- `prod` contour, until the same smoke is run there

So the correct statement is:
- `test`: confirmed working end-to-end
- `prod`: expected to work with the same contract, but still needs its own live smoke

Practical interpretation for frontend:
- if the same route set and request shapes are used, backend attachment runtime on `test` should be treated as confirmed working
- after this verification, new failures are most likely in one of these places:
  - auth facade forwarding
  - browser-side request handling
  - frontend state/polling/refetch logic
  - violating the signed upload contract
- do not assume a backend runtime bug first if `/test/ops/info` attachment harness passes for the same contour

## High-level model

Attachment flow is split into two planes.

Control plane:
- browser calls auth facade routes under `/ops/auth/attachments/*` or `/test/ops/auth/attachments/*`
- backend validates and enqueues async mutations

Data plane:
- binary upload goes directly from browser to Object Storage using returned presigned `uploadUrl`
- binary read goes through backend-owned `view` / `download` routes, which then redirect to storage

## Browser routes used by frontend

Prod:
- `POST /ops/auth/attachments/request-upload`
- `POST /ops/auth/attachments/finalize`
- `POST /ops/auth/attachments/delete`
- `GET /ops/auth/attachments/jobs/{job_id}`
- `GET /ops/auth/attachments/{attachment_id}/view`
- `GET /ops/auth/attachments/{attachment_id}/download`

Test:
- `POST /test/ops/auth/attachments/request-upload`
- `POST /test/ops/auth/attachments/finalize`
- `POST /test/ops/auth/attachments/delete`
- `GET /test/ops/auth/attachments/jobs/{job_id}`
- `GET /test/ops/auth/attachments/{attachment_id}/view`
- `GET /test/ops/auth/attachments/{attachment_id}/download`

These auth routes are expected to forward to backend-owned routes with trusted headers and proxy secret.

## Canonical upload flow

### 1. Request upload contract

Call:
- `POST .../auth/attachments/request-upload`

Body:
```json
{
  "task_id": "1111111111",
  "filename": "example.jpg",
  "mime": "image/jpeg",
  "size": 582339,
  "uploaded_by": "frontend_user_or_operator"
}
```

Successful response:
- `artifact = attachment_upload_request`
- includes:
  - `attachment_id`
  - `uploadUrl`
  - `headers`
  - `method`
  - `expiresIn`
  - `diagnostics`

Important rules:
- use `uploadUrl` exactly as returned
- use exact method from contract, currently `PUT`
- send exact headers from contract, currently exact `Content-Type`

### 2. Upload binary directly to Object Storage

Browser must send direct request to returned `uploadUrl`.

Current contract:
- method: `PUT`
- header: exact `Content-Type`
- body: raw file bytes

Do not:
- proxy binary upload through auth facade
- proxy binary upload through backend function
- change URL/query params
- add unexpected custom headers unless backend starts signing them

Upload success condition:
- Object Storage returns `200`

### 3. Finalize

Call:
- `POST .../auth/attachments/finalize`

Body:
```json
{
  "task_id": "1111111111",
  "attachment_id": "returned_attachment_id",
  "uploaded_by": "frontend_user_or_operator"
}
```

Expected response:
- `202`
- `artifact = attachment_finalize_enqueued`
- contains `job_id`

Finalize does not mean attachment is already visible.
It only means:
- storage object was verified
- attach job was enqueued

### 4. Poll async job

Call:
- `GET .../auth/attachments/jobs/{job_id}`

Terminal statuses:
- `success`
- `failed_retryable`
- `failed_terminal`

Non-terminal statuses:
- `accepted`
- `running`

Frontend should treat attachment as not ready until job reaches:
- `success`

### 5. Refresh frontend/task state

After job `success`, refetch task data from the normal frontend read path.

Expected outcome:
- attachment appears in `tasks[].attachments`

Current backend behavior after successful attach/delete:
- prep snapshot is rebuilt
- exact default frontend response cache entries are invalidated best-effort

Meaning:
- frontend should still do a refetch after terminal job success
- backend should not require a full snapshot refresh

Important:
- direct `PUT` success does not make the file visible yet
- `finalize` success with `202` does not make the file visible yet
- only terminal `jobs/{job_id} = success` plus a refetch is the readiness signal

## Read flow

Frontend payload exposes safe metadata only.

Expected attachment fields:
- `id`
- `name`
- `mime`
- `kind`
- `sizeBytes`
- `status`
- `uploadedAt`
- `capabilities`
- `meta.preview` when present
- `links.view`
- `links.download`

Not exposed:
- storage key
- bucket internals
- raw storage URL

### View

Use:
- `GET .../auth/attachments/{attachment_id}/view`

Expected behavior:
- backend/auth route returns redirect flow to short-lived storage read URL

### Download

Use:
- `GET .../auth/attachments/{attachment_id}/download`

Expected behavior:
- backend/auth route returns redirect flow to short-lived storage read URL

Frontend should not attempt to construct storage URLs manually.

## Delete flow

Call:
- `POST .../auth/attachments/delete`

Body:
```json
{
  "task_id": "1111111111",
  "attachment_id": "existing_attachment_id",
  "deleted_by": "frontend_user_or_operator"
}
```

Expected response:
- `202`
- `artifact = attachment_delete_enqueued`
- contains `job_id`

Then:
1. poll `jobs/{job_id}`
2. wait for terminal `success`
3. refetch frontend/task payload

Expected result:
- attachment disappears from `tasks[].attachments`

## Security rules

### Trusted browser control-plane only

Browser must use auth facade for:
- `request-upload`
- `finalize`
- `delete`
- `jobs/{job_id}`
- `view`
- `download`

Backend special routes under `/ops/admin/*` and `/ops/api/task-attachments/*` are not intended for direct untrusted browser access.

### Direct upload is deliberate

Direct upload to Object Storage is intentional:
- avoids routing binary through backend runtime
- keeps queue payloads small
- keeps backend snapshot-first architecture intact

### Access policy

Read access to attachment content requires:
- trusted ingress
- authenticated browser session
- access mode `full`
- approved user status

Masked contour:
- attachments are hidden entirely

## UX recommendations for frontend

### Treat lifecycle as async

Do not show attachment as ready immediately after:
- `request-upload`
- direct `PUT`
- `finalize`

Ready means:
- finalize returned `202`
- async job reached terminal `success`
- frontend/task refetch shows attachment in payload

### Recommended UI states

Suggested states:
- `requesting_upload_contract`
- `uploading_binary`
- `finalizing`
- `waiting_for_backend`
- `ready`
- `failed`

Suggested delete states:
- `delete_requested`
- `waiting_for_backend_delete`
- `deleted`
- `delete_failed`

### Polling recommendation

Reasonable default:
- poll `jobs/{job_id}` every 2 seconds
- timeout around 60 attempts for operator tools

### Error handling

For `request-upload` errors, backend now returns structured JSON:
- `error.code`
- `error.message`
- `error.details.step = request-upload`
- `error.details.reason`

For browser upload failures:
- log full `diagnostics` block from `request-upload`
- log browser error text
- log upload host and method

For post-finalize failures:
- log full `jobs/{job_id}` payload
- log whether frontend refetched after terminal `success`
- log the attachment id expected in `tasks[].attachments`

For read-path failures:
- log exact `view` / `download` auth route used
- log final response status / redirect behavior
- do not replace backend-provided links with frontend-generated URLs

## What has been live-confirmed on `test`

Confirmed by `/test/ops/info` attachment harness:
- upload contract issuance works
- direct browser upload to Object Storage works
- finalize verification works
- attach job starts and completes
- attachment becomes `ready` and `snapshotVisible=true`
- `view` redirect works
- `download` redirect works
- delete job starts and completes
- attachment disappears after delete
- prep rebuild happens on attach and delete
- frontend attachment visibility follows async terminal job state

Additional operator confirmation:
- `/test/ops/info` now shows current probe-task attachments as cards
- each card supports direct `Open file`, `Download file`, and `Delete file`
- this lets backend operators validate the same read/delete contour independently from product UI

## Known caveats

- Old `pending_upload` probe attachments may still exist in the reserved probe task from earlier failed runs; they are not frontend-visible and are cleaned separately by cleanup policy.
- Reserved probe task currently uses real task status `done`; this is acceptable for operator diagnostics and does not block attachment flow.
- `prod` still needs its own live smoke before claiming the same level of confidence there.

## Backend-first troubleshooting rule

When attachment issues are reported on `test`, use this order:

1. Reproduce in `/test/ops/info`
2. If `/test/ops/info` fails:
   - treat it as backend/auth/storage contour issue
3. If `/test/ops/info` passes but product UI fails:
   - treat it as frontend/auth integration issue unless proven otherwise

This rule exists because `/test/ops/info` now verifies:
- upload contract issuance
- direct browser upload
- finalize
- async job completion
- publication into snapshot/API
- read routes
- delete routes

## Recommended frontend implementation checklist

- use auth facade routes only for control-plane requests
- use direct browser `PUT` for binary upload
- use exact signed method and headers
- poll `jobs/{job_id}` until terminal state
- refetch task/frontend payload after terminal success
- show `view` / `download` from payload links only
- delete through auth facade and refetch after terminal success
- surface backend JSON errors and upload diagnostics verbatim in debug tools
- when debugging, compare behavior against `/test/ops/info` before filing backend-runtime issues

## Related docs

- [file_attachments.md](/n:/PROJECTS/python/SCRIPT/DTM/docs/system/file_attachments.md)
- [browser_auth_contract.md](/n:/PROJECTS/python/SCRIPT/DTM/docs/system/browser_auth_contract.md)
- [browser_auth_runbook.md](/n:/PROJECTS/python/SCRIPT/DTM/docs/system/browser_auth_runbook.md)
