# File Attachments (Current)

This document describes the active task-attachment contour.

## Purpose

Task attachments are stored as binary objects in Object Storage, while canonical attachment metadata is stored in the snapshot extra-store and exposed through snapshot-backed read paths.

## Current flow

The canonical upload flow is:

1. Request an upload contract from the attachment admin HTTP path.
2. Upload the binary directly to Object Storage using the returned presigned URL.
3. Finalize the uploaded object; backend verifies object existence, size, and mime.
4. Finalize enqueues metadata attachment through the command queue.
5. Worker writes canonical attachment metadata into the extra snapshot and rebuilds prep.

## HTTP/admin intake

Upload-contract request:
- `POST /ops/admin/task-attachments/request-upload`
- `POST /test/ops/admin/task-attachments/request-upload`

Transitional wrapper still accepted:
- `POST /admin/attachments/request-upload`

Required request body:
- `task_id`
- `filename`
- `mime`
- `size`
- `uploaded_by`

Response artifact:
- `attachment_upload_request`

Returned fields:
- `task_id`
- `attachment_id`
- `key`
- `filename`
- `mime`
- `size`
- `kind`
- `expiresIn`
- `method`
- `uploadUrl`
- `headers`

The handler validates:
- task exists in the current prep snapshot
- mime type is supported
- filename is normalized into a safe storage key

Finalize request:
- `POST /ops/admin/task-attachments/finalize`
- `POST /test/ops/admin/task-attachments/finalize`

Required request body:
- `task_id`
- `attachment_id`
- `uploaded_by`

Behavior:
- verifies uploaded object with `head_object`
- enforces size/mime consistency
- records `uploaded_unverified`
- enqueues `attach_task_file`

Delete request:
- `POST /ops/admin/task-attachments/delete`
- `POST /test/ops/admin/task-attachments/delete`

Required request body:
- `task_id`
- `attachment_id`
- `deleted_by`

Metadata attach enqueue:
- `POST /admin/commands/attach-task-file`

Required request body:
- `task_id`
- `key`
- `filename`
- `mime`
- `size`
- `uploaded_by`

Optional request body:
- `attachment_id`
- `preview`

This compatibility endpoint only enqueues command `attach_task_file`; canonical callers should use `finalize`.

Hidden cleanup enqueue:
- `POST /admin/commands/cleanup-task-attachments`

Request body:
- `ttl_seconds` (optional, default `86400`)

Behavior:
- enqueues `cleanup_task_attachments`
- scans bulk attachment metadata for stale `pending_upload`, `uploaded_unverified`, and `deleted` records
- best-effort deletes the underlying storage object when `storage_key` is present
- removes stale metadata and rebuilds prep once if anything changed

## Storage contract

Object Storage key scheme:
- `attachments/{env}/{task_id}/{attachment_id}-{filename}`

Binary payloads:
- are uploaded directly to Object Storage
- are never placed into queue payloads
- are never embedded into snapshots

Attachment metadata is persisted in the extra snapshot under:
- `snapshots/{env}/extra/default.json`

Canonical metadata model includes:
- `attachment_id`
- `task_id`
- `filename_original`
- `filename_display`
- `mime_type`
- `kind`
- `size_bytes`
- `status`
- `storage_bucket` (internal only)
- `storage_key` (internal only)
- `storage_etag`
- `storage_version`
- `uploaded_by_user_id`
- `uploaded_at`
- `verified_at`
- `deleted_at`
- `deleted_by_user_id`
- `error_code`
- `error_message`
- `snapshot_visible`
- `preview_capabilities`
- future enrichment fields reserved for later waves

## Worker/job behavior

Command type:
- `attach_task_file`
- `delete_task_attachment`
- `cleanup_task_attachments`

Runtime path:
- `AdminTaskAttachmentsHandler` serves canonical request-upload/finalize/delete routes
- `Worker` dispatches command to `AttachTaskFileJob`
- `Worker` dispatches delete mutations to `DeleteTaskAttachmentJob`
- `AttachTaskFileJob` calls `SnapshotEngine.attach_file_metadata(...)`
- `SnapshotEngine` updates bulk extra snapshot and rebuilds prep from current raw snapshot

Worker responsibilities:
1. validate required metadata
2. verify object before attach publication
3. append/replace attachment metadata in task extra record
4. persist bulk extra snapshot
5. rebuild and write prep snapshot
6. revoke readability and remove metadata during delete
7. remove stale non-ready/deleted metadata during cleanup with one bulk prep rebuild

## Read path behavior

Frontend API v2 exposes attachment metadata through:
- `tasks[].attachments`

Exposed fields:
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

Read routes:
- `GET /ops/api/task-attachments/{attachment_id}/view`
- `GET /ops/api/task-attachments/{attachment_id}/download`
- same routes under `/test`

Security and visibility rules:
- only `ready` + `snapshot_visible` attachments are published into task payloads
- masked contour hides attachments entirely
- read access requires trusted ingress + authenticated + `full` + `approved`
- storage keys are intentionally not exposed through the frontend payload

## Lifecycle and cleanup policy

Active lifecycle states:
- `pending_upload`
- `uploaded_unverified`
- `ready`
- `delete_pending`
- `deleted`
- `failed`

Publication rules:
- only `ready` + `snapshot_visible=true` attachments are published into task payloads
- masked contour hides attachments entirely
- `deleted`, `pending_upload`, `uploaded_unverified`, and `failed` attachments are never frontend-visible

Cleanup v1 policy:
- stale `pending_upload` older than 24h -> orphan candidate
- stale `uploaded_unverified` older than 24h -> orphan candidate
- stale `deleted` older than 24h -> final cleanup candidate
- `ready` records are never touched by cleanup
- `delete_pending` younger than TTL is never touched by cleanup
- transient storage-delete failure keeps metadata and records a warning

Reference timestamps:
- `pending_upload` -> `uploaded_at_utc`
- `uploaded_unverified` -> `verified_at_utc`, fallback `uploaded_at_utc`
- `deleted` -> `deleted_at_utc`

Cleanup carrier:
- no separate attachment table/store in v1
- stale cleanup scans the existing bulk extra snapshot only

## Operator smoke runbook

Minimal manual smoke on `test`:
1. `POST /test/ops/admin/task-attachments/request-upload`
2. direct `PUT` to returned `uploadUrl`
3. `POST /test/ops/admin/task-attachments/finalize`
4. wait for worker and confirm attachment appears in trusted `GET /test/ops/api/v2/frontend`
5. confirm masked `GET /test/ops/api/v2/frontend` hides attachments
6. `GET /test/ops/api/task-attachments/{attachment_id}/view` -> expect `302`
7. `GET /test/ops/api/task-attachments/{attachment_id}/download` -> expect `302`
8. `POST /test/ops/admin/task-attachments/delete`
9. wait for worker and confirm attachment no longer appears in trusted frontend payload

Expected statuses:
- `request-upload` -> `200`
- direct Object Storage `PUT` -> `200`
- `finalize` -> `202`
- `delete` -> `202`
- `view` / `download` for trusted full approved access -> `302`

Contour note:
- `test` live smoke is verified against deployed runtime
- `prod` smoke requires running the manual release workflow first because push to `main` does not deploy the function by itself

## Current boundaries

Active code pointers:
- `src/entrypoints/http/admin_task_attachments_handler.py`
- `src/entrypoints/http/task_attachment_read_handler.py`
- `src/jobs/attach_task_file_job.py`
- `src/jobs/delete_task_attachment_job.py`
- `src/services/attachments/*`
- `src/snapshot_engine/engine.py`
- `src/snapshot_engine/frontend_v2_payload_builder.py`

Tests:
- `tests/api/test_command_queue_foundation.py`
- `tests/api/test_task_attachment_read_handler.py`
- `tests/jobs/test_attach_task_file_job.py`
- `tests/jobs/test_delete_task_attachment_job.py`
- `tests/snapshot_engine/test_engine_attach_metadata.py`
- `tests/snapshot_engine/test_query_engine.py`

## Guardrails

- no binary payload in queue messages
- no direct prep mutation without extra-store update
- no attachment metadata write through legacy YDB path
- no read access for non-ready, deleted, or masked attachments
