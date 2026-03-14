import { getBackendAdminRequestBase } from "../config/runtimeContour";

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

function buildBackendAdminUrl(path: string): string {
  return `${getBackendAdminRequestBase()}${path}`;
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const payload = await res.json();
    return typeof payload?.error === "string" ? payload.error : `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function requestTaskAttachmentUpload(args: {
  taskId: string;
  filename: string;
  mime: string;
  size: number;
  uploadedBy: string;
}): Promise<AttachmentUploadContract> {
  const res = await fetch(buildBackendAdminUrl("/task-attachments/request-upload"), {
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
    throw new Error(await parseErrorResponse(res));
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
    throw new Error(`Upload failed: HTTP ${res.status}`);
  }
}

export async function finalizeTaskAttachmentUpload(args: {
  taskId: string;
  attachmentId: string;
  uploadedBy: string;
}): Promise<void> {
  const res = await fetch(buildBackendAdminUrl("/task-attachments/finalize"), {
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
    throw new Error(await parseErrorResponse(res));
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
