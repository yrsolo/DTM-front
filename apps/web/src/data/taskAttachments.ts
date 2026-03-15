import { getAuthRequestBase } from "../config/runtimeContour";

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
};

export type TaskAttachmentUploadStage = "request-upload" | "upload-binary" | "finalize";

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
    return typeof payload?.error === "string" ? payload.error : `HTTP ${res.status}`;
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
}): Promise<void> {
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
}

export async function fetchAttachmentArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { accept: "*/*" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return await res.arrayBuffer();
}

export function getBrowserAttachmentUrl(url: string): string {
  return url;
}
