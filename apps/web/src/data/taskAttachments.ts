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

  constructor(args: {
    stage: TaskAttachmentUploadStage;
    message: string;
    status?: number | null;
    details?: string | null;
    host?: string | null;
  }) {
    super(args.message);
    this.name = "TaskAttachmentUploadError";
    this.stage = args.stage;
    this.status = args.status ?? null;
    this.details = args.details ?? null;
    this.host = args.host ?? null;
  }
}

function buildBackendAdminUrl(path: string): string {
  return `${getAuthRequestBase()}${path}`;
}

function rewriteAttachmentUrl(url: string): string {
  try {
    const parsed = new URL(url, typeof window !== "undefined" ? window.location.origin : "https://dtm.solofarm.ru");
    const match = parsed.pathname.match(/^(\/test)?\/ops\/api\/task-attachments\/([^/]+)\/(view|download)$/);
    if (!match) return parsed.toString();
    const contourPrefix = match[1] ?? "";
    return `${parsed.origin}${contourPrefix}/ops/auth/attachments/${match[2]}/${match[3]}`;
  } catch {
    return url;
  }
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
  const res = await fetch(buildBackendAdminUrl("/attachments/request-upload"), {
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
  const method = contract.method?.trim().toUpperCase() || "PUT";
  const res = await fetch(contract.uploadUrl, {
    method,
    headers: contract.headers ?? undefined,
    body: file,
  });
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
    });
  }
}

export async function finalizeTaskAttachmentUpload(args: {
  taskId: string;
  attachmentId: string;
  uploadedBy: string;
}): Promise<void> {
  const res = await fetch(buildBackendAdminUrl("/attachments/finalize"), {
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
  const res = await fetch(rewriteAttachmentUrl(url), {
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
  return rewriteAttachmentUrl(url);
}
