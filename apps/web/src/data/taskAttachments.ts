import { getAuthBasePath, getAuthRequestBase, getRuntimeOrigin } from "../config/runtimeContour";

export type AttachmentUploadContract = {
  task_id: string;
  attachment_id: string;
  key: string;
  filename: string;
  mime: string;
  size: number;
  kind?: string | null;
  expiresIn?: number;
  method?: string | null;
  uploadUrl: string;
  headers?: Record<string, string>;
  diagnostics?: {
    uploadContractVersion?: string | null;
    signedMethod?: string | null;
    signedContentType?: string | null;
    requiredHeaders?: string[] | null;
    uploadUrlScheme?: string | null;
    uploadUrlHost?: string | null;
    uploadUrlPath?: string | null;
    expiresAtUtc?: string | null;
    browserMayRequirePreflight?: boolean | null;
    notes?: string[] | null;
  } | null;
};

export type AttachmentFinalizeResult = {
  jobId: string;
  artifact?: string | null;
};

export type AttachmentDeleteResult = {
  jobId: string;
  artifact?: string | null;
};

export type AttachmentJobStatus =
  | "accepted"
  | "running"
  | "success"
  | "failed_retryable"
  | "failed_terminal";

export type AttachmentJobStatusResult = {
  jobId: string;
  status: AttachmentJobStatus;
  artifact?: string | null;
  details?: string | null;
};

export type TaskAttachmentUploadStage = "request-upload" | "upload-binary" | "finalize" | "job-poll" | "delete";

export class TaskAttachmentUploadError extends Error {
  stage: TaskAttachmentUploadStage;
  status: number | null;
  details: string | null;
  host: string | null;
  method: string | null;

  constructor(args: {
    stage: TaskAttachmentUploadStage;
    message: string;
    status?: number | null;
    details?: string | null;
    host?: string | null;
    method?: string | null;
  }) {
    super(args.message);
    this.name = "TaskAttachmentUploadError";
    this.stage = args.stage;
    this.status = args.status ?? null;
    this.details = args.details ?? null;
    this.host = args.host ?? null;
    this.method = args.method ?? null;
  }
}

function buildBackendAdminUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const payload = await res.json();
    if (typeof payload?.error === "string") {
      return payload.error;
    }
    if (payload?.error && typeof payload.error === "object") {
      const parts = [
        typeof payload.error.code === "string" ? `code=${payload.error.code}` : null,
        typeof payload.error.message === "string" ? `message=${payload.error.message}` : null,
        typeof payload.error.details?.step === "string" ? `step=${payload.error.details.step}` : null,
        typeof payload.error.details?.reason === "string" ? `reason=${payload.error.details.reason}` : null,
        typeof payload.error.details?.field === "string" ? `field=${payload.error.details.field}` : null,
      ].filter(Boolean);
      if (parts.length) {
        return parts.join(" | ");
      }
    }
    return `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

function extractHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

function normalizeJobId(payload: any): string | null {
  if (typeof payload?.job_id === "string" && payload.job_id.trim()) return payload.job_id.trim();
  if (typeof payload?.jobId === "string" && payload.jobId.trim()) return payload.jobId.trim();
  if (typeof payload?.job?.id === "string" && payload.job.id.trim()) return payload.job.id.trim();
  return null;
}

function normalizeJobStatus(payload: any): AttachmentJobStatus | null {
  const raw =
    typeof payload?.status === "string"
      ? payload.status
      : typeof payload?.job?.status === "string"
        ? payload.job.status
        : null;
  if (!raw) return null;
  const normalized = raw.trim().toLowerCase();
  if (
    normalized === "accepted" ||
    normalized === "running" ||
    normalized === "success" ||
    normalized === "failed_retryable" ||
    normalized === "failed_terminal"
  ) {
    return normalized;
  }
  return null;
}

function normalizeArtifact(payload: any): string | null {
  return typeof payload?.artifact === "string" && payload.artifact.trim() ? payload.artifact.trim() : null;
}

export async function requestTaskAttachmentUpload(args: {
  taskId: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
}): Promise<AttachmentUploadContract> {
  let res: Response;
  try {
    res = await fetch(buildBackendAdminUrl("/attachments/request-upload"), {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        task_id: args.taskId,
        filename: args.filename,
        mime: args.mime,
        size: args.size,
        uploaded_by: args.uploadedBy,
      }),
    });
  } catch (error) {
    throw new TaskAttachmentUploadError({
      stage: "request-upload",
      message: error instanceof Error ? error.message : "request-upload network error",
      details: error instanceof Error ? error.message : "network error",
      host: extractHost(buildBackendAdminUrl("/attachments/request-upload")),
    });
  }

  if (!res.ok) {
    const details = await parseErrorResponse(res);
    throw new TaskAttachmentUploadError({
      stage: "request-upload",
      message: `request-upload failed (${res.status})`,
      status: res.status,
      details,
      host: extractHost(buildBackendAdminUrl("/attachments/request-upload")),
    });
  }

  return (await res.json()) as AttachmentUploadContract;
}

export async function uploadTaskAttachmentBinary(contract: AttachmentUploadContract, file: File): Promise<void> {
  const preferredMethod = contract.method?.trim().toUpperCase() || "PUT";

  let res: Response;
  let effectiveMethod = preferredMethod;
  try {
    // Canonical backend contract: binary upload goes directly to presigned Object Storage URL.
    res = await fetch(contract.uploadUrl, {
      method: effectiveMethod,
      headers: contract.headers ?? undefined,
      body: file,
    });
    if (res.status === 405 && effectiveMethod !== "PUT") {
      effectiveMethod = "PUT";
      res = await fetch(contract.uploadUrl, {
        method: effectiveMethod,
        headers: contract.headers ?? undefined,
        body: file,
      });
    }
  } catch (error) {
    throw new TaskAttachmentUploadError({
      stage: "upload-binary",
      message: error instanceof Error ? error.message : "upload-binary network error",
      details: error instanceof Error ? error.message : "network error",
      host: extractHost(contract.uploadUrl),
      method: effectiveMethod,
    });
  }

  if (!res.ok) {
    let details: string | null = null;
    try {
      details = (await res.text()).trim() || null;
    } catch {
      details = null;
    }
    throw new TaskAttachmentUploadError({
      stage: "upload-binary",
      message: `upload-binary failed (${res.status})`,
      status: res.status,
      details,
      host: extractHost(contract.uploadUrl),
      method: effectiveMethod,
    });
  }
}

export async function finalizeTaskAttachmentUpload(args: {
  taskId: string;
  attachmentId: string;
  uploadedBy: string;
}): Promise<AttachmentFinalizeResult> {
  let res: Response;
  try {
    res = await fetch(buildBackendAdminUrl("/attachments/finalize"), {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        task_id: args.taskId,
        attachment_id: args.attachmentId,
        uploaded_by: args.uploadedBy,
      }),
    });
  } catch (error) {
    throw new TaskAttachmentUploadError({
      stage: "finalize",
      message: error instanceof Error ? error.message : "finalize network error",
      details: error instanceof Error ? error.message : "network error",
      host: extractHost(buildBackendAdminUrl("/attachments/finalize")),
    });
  }
  if (!res.ok) {
    const details = await parseErrorResponse(res);
    throw new TaskAttachmentUploadError({
      stage: "finalize",
      message: `finalize failed (${res.status})`,
      status: res.status,
      details,
      host: extractHost(buildBackendAdminUrl("/attachments/finalize")),
    });
  }

  const payload = await res.json().catch(() => null);
  const jobId = normalizeJobId(payload);
  if (!jobId) {
    throw new TaskAttachmentUploadError({
      stage: "finalize",
      message: "finalize failed (missing job id)",
      status: res.status,
      details: "missing job_id in finalize response",
      host: extractHost(buildBackendAdminUrl("/attachments/finalize")),
    });
  }

  return {
    jobId,
    artifact: normalizeArtifact(payload),
  };
}

export async function deleteTaskAttachment(args: {
  taskId: string;
  attachmentId: string;
  deletedBy: string;
}): Promise<AttachmentDeleteResult> {
  let res: Response;
  try {
    res = await fetch(buildBackendAdminUrl("/attachments/delete"), {
      method: "POST",
      credentials: "include",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        task_id: args.taskId,
        attachment_id: args.attachmentId,
        deleted_by: args.deletedBy,
      }),
    });
  } catch (error) {
    throw new TaskAttachmentUploadError({
      stage: "delete",
      message: error instanceof Error ? error.message : "delete network error",
      details: error instanceof Error ? error.message : "network error",
      host: extractHost(buildBackendAdminUrl("/attachments/delete")),
    });
  }

  if (!res.ok) {
    const details = await parseErrorResponse(res);
    throw new TaskAttachmentUploadError({
      stage: "delete",
      message: `delete failed (${res.status})`,
      status: res.status,
      details,
      host: extractHost(buildBackendAdminUrl("/attachments/delete")),
    });
  }

  const payload = await res.json().catch(() => null);
  const jobId = normalizeJobId(payload);
  if (!jobId) {
    throw new TaskAttachmentUploadError({
      stage: "delete",
      message: "delete failed (missing job id)",
      status: res.status,
      details: "missing job_id in delete response",
      host: extractHost(buildBackendAdminUrl("/attachments/delete")),
    });
  }

  return {
    jobId,
    artifact: normalizeArtifact(payload),
  };
}

export async function getAttachmentJobStatus(jobId: string): Promise<AttachmentJobStatusResult> {
  const jobPath = `/attachments/jobs/${encodeURIComponent(jobId)}`;
  let res: Response;
  try {
    res = await fetch(buildBackendAdminUrl(jobPath), {
      method: "GET",
      credentials: "include",
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });
  } catch (error) {
    throw new TaskAttachmentUploadError({
      stage: "job-poll",
      message: error instanceof Error ? error.message : "job-poll network error",
      details: error instanceof Error ? error.message : "network error",
      host: extractHost(buildBackendAdminUrl(jobPath)),
    });
  }

  if (!res.ok) {
    const details = await parseErrorResponse(res);
    throw new TaskAttachmentUploadError({
      stage: "job-poll",
      message: `job-poll failed (${res.status})`,
      status: res.status,
      details,
      host: extractHost(buildBackendAdminUrl(jobPath)),
    });
  }

  const payload = await res.json().catch(() => null);
  const status = normalizeJobStatus(payload);
  if (!status) {
    throw new TaskAttachmentUploadError({
      stage: "job-poll",
      message: "job-poll failed (missing status)",
      details: "missing or unsupported job status",
      host: extractHost(buildBackendAdminUrl(jobPath)),
    });
  }

  return {
    jobId: normalizeJobId(payload) ?? jobId,
    status,
    artifact: normalizeArtifact(payload),
    details:
      typeof payload?.message === "string" && payload.message.trim()
        ? payload.message.trim()
        : typeof payload?.error?.message === "string" && payload.error.message.trim()
          ? payload.error.message.trim()
          : null,
  };
}

export async function pollAttachmentJob(
  jobId: string,
  options?: {
    intervalMs?: number;
    maxAttempts?: number;
  }
): Promise<AttachmentJobStatusResult> {
  const intervalMs = options?.intervalMs ?? 2000;
  const maxAttempts = options?.maxAttempts ?? 60;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await getAttachmentJobStatus(jobId);
    if (result.status === "success") {
      return result;
    }
    if (result.status === "failed_retryable" || result.status === "failed_terminal") {
      throw new TaskAttachmentUploadError({
        stage: "job-poll",
        message: `job-poll finished with ${result.status}`,
        details: result.details ?? `job status=${result.status}`,
      });
    }
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }

  throw new TaskAttachmentUploadError({
    stage: "job-poll",
    message: "job-poll timed out",
    details: `job ${jobId} did not reach terminal success in time`,
  });
}

export async function fetchAttachmentArrayBuffer(url: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { accept: "*/*" },
    cache: "no-store",
    signal,
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.arrayBuffer();
}

function buildAttachmentReadFacadeUrl(
  attachmentId: string,
  action: "view" | "download",
  search = "",
  hash = "",
  pathname?: string
): string {
  return `${getRuntimeOrigin(pathname)}${getAuthBasePath(pathname)}/attachments/${attachmentId}/${action}${search}${hash}`;
}

function normalizeAttachmentReadUrl(url: string): string {
  const runtimeOrigin = getRuntimeOrigin();
  let parsed: URL;
  try {
    parsed = new URL(url, runtimeOrigin);
  } catch {
    return url;
  }

  const authMatch = parsed.pathname.match(/^\/(?:test\/)?ops\/auth\/attachments\/([^/]+)\/(view|download)$/);
  if (authMatch) {
    return parsed.toString();
  }

  const backendMatch = parsed.pathname.match(
    /^\/(?:(?:test\/)?ops\/)?api\/task-attachments\/([^/]+)\/(view|download)$/
  );
  if (backendMatch) {
    return buildAttachmentReadFacadeUrl(
      backendMatch[1],
      backendMatch[2] as "view" | "download",
      parsed.search,
      parsed.hash
    );
  }

  return parsed.toString();
}

export function getBrowserAttachmentUrl(url: string): string {
  return normalizeAttachmentReadUrl(url);
}
