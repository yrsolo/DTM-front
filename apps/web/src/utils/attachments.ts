import { TaskAttachmentV1 } from "@dtm/schema/snapshot";

function fileExtension(name: string): string {
  const clean = name.trim().toLowerCase();
  const dotIndex = clean.lastIndexOf(".");
  return dotIndex >= 0 ? clean.slice(dotIndex + 1) : "";
}

const UPLOAD_MIME_BY_EXTENSION: Record<string, string> = {
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function isDocxAttachment(attachment: TaskAttachmentV1): boolean {
  const mime = attachment.mime.toLowerCase();
  const ext = fileExtension(attachment.name);
  return (
    mime.includes("wordprocessingml.document") ||
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "docx"
  );
}

export function isImageAttachment(attachment: TaskAttachmentV1): boolean {
  return attachment.mime.toLowerCase().startsWith("image/");
}

export function attachmentTypeLabel(attachment: TaskAttachmentV1): string {
  const ext = fileExtension(attachment.name);
  if (ext) return ext.toUpperCase();
  if (attachment.kind.trim()) return attachment.kind.trim().slice(0, 4).toUpperCase();
  return "FILE";
}

export function attachmentIconLabel(attachment: TaskAttachmentV1): string {
  const ext = fileExtension(attachment.name);
  if (ext) return ext.slice(0, 4).toUpperCase();
  if (attachment.kind.trim()) return attachment.kind.trim().slice(0, 4).toUpperCase();
  return "FILE";
}

export function attachmentToneClass(attachment: TaskAttachmentV1): string {
  if (isDocxAttachment(attachment)) return "isDocx";
  if (isImageAttachment(attachment)) return "isImage";
  const ext = fileExtension(attachment.name);
  if (ext === "pdf") return "isPdf";
  if (ext === "xls" || ext === "xlsx") return "isSheet";
  if (ext === "ppt" || ext === "pptx") return "isDeck";
  return "isGeneric";
}

export function formatAttachmentUploadedAt(value: string | null | undefined, locale: "ru" | "en"): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(locale === "ru" ? "ru-RU" : "en-US", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function supportsInlinePreview(attachment: TaskAttachmentV1): boolean {
  return isDocxAttachment(attachment) || isImageAttachment(attachment);
}

export function inferUploadMimeType(file: Pick<File, "name" | "type">): string {
  const browserMime = typeof file.type === "string" ? file.type.trim() : "";
  if (browserMime && browserMime !== "application/octet-stream") {
    return browserMime;
  }

  const ext = fileExtension(file.name);
  return UPLOAD_MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}
