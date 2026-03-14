import { getAuthRuntimeConfig } from "../config";
import { badRequest, forbidden } from "../http";
import { clearSessionCookie } from "../session/cookieSession";
import { getAccessMode, resolveSession } from "../middleware/auth";
import type { HttpResult, NormalizedRequest } from "../types";

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "cookie",
]);

const INTERNAL_PROXY_HEADERS = new Set([
  "x-dtm-proxy-secret",
  "x-dtm-force-mask",
  "x-dtm-access-mode",
  "x-dtm-authenticated",
  "x-dtm-user-id",
  "x-dtm-user-role",
  "x-dtm-user-status",
  "x-dtm-contour",
]);

const STRIP_RESPONSE_HEADERS = new Set([
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "vary",
  "content-encoding",
  "content-length",
]);

function buildTrustedHeaders(req: NormalizedRequest, user: Awaited<ReturnType<typeof resolveSession>>["user"]) {
  const cfg = getAuthRuntimeConfig();
  const accessMode = getAccessMode(user);
  const isApprovedFullRequest = Boolean(user && user.status === "approved" && accessMode === "full");
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP_HEADERS.has(key)) continue;
    if (INTERNAL_PROXY_HEADERS.has(key)) continue;
    headers.set(key, value);
  }

  headers.set("x-dtm-proxy-secret", cfg.browserAuthProxySecret);
  headers.set("x-dtm-access-mode", accessMode);
  headers.set("x-dtm-authenticated", user ? "1" : "0");
  headers.set("x-dtm-contour", cfg.contour);
  if (isApprovedFullRequest && user) {
    headers.set("x-dtm-user-id", user.id);
    headers.set("x-dtm-user-role", user.role);
    headers.set("x-dtm-user-status", user.status);
  }

  return headers;
}

async function proxyTrustedRequest(req: NormalizedRequest, upstreamPath: string): Promise<HttpResult> {
  const cfg = getAuthRuntimeConfig();
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  const upstreamUrl = new URL(
    `${cfg.apiUpstreamOrigin.replace(/\/+$/, "")}${upstreamPath}${req.query.toString() ? `?${req.query.toString()}` : ""}`
  );

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers: buildTrustedHeaders(req, user),
    body:
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : req.bodyBytes
          ? Buffer.from(req.bodyBytes)
          : req.bodyText || undefined,
    redirect: "manual",
  });

  const responseHeaders: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || STRIP_RESPONSE_HEADERS.has(normalizedKey)) return;
    responseHeaders[key] = value;
  });

  const result: HttpResult = {
    statusCode: upstreamRes.status,
    headers: responseHeaders,
  };

  const bodyBuffer = Buffer.from(await upstreamRes.arrayBuffer());
  result.body = bodyBuffer.length > 0 ? bodyBuffer.toString("base64") : "";
  result.isBase64Encoded = true;

  if (clearCookie) {
    result.multiValueHeaders = { "set-cookie": [clearSessionCookie()] };
  }

  return result;
}

export function proxyAttachmentAdminRequest(req: NormalizedRequest, suffix: string): Promise<HttpResult> {
  return proxyTrustedRequest(req, `/v2/admin/task-attachments/${suffix}`);
}

export function proxyAttachmentReadRequest(
  req: NormalizedRequest,
  attachmentId: string,
  action: "view" | "download"
): Promise<HttpResult> {
  return proxyTrustedRequest(req, `/task-attachments/${attachmentId}/${action}`);
}

function decodeHeaderValue(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function parseUploadHeaders(value: string | undefined): Record<string, string> {
  const decoded = decodeHeaderValue(value);
  if (!decoded) return {};
  try {
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string")
    );
  } catch {
    return {};
  }
}

export async function proxyAttachmentBinaryUpload(req: NormalizedRequest): Promise<HttpResult> {
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  if (!user || user.status !== "approved" || user.role !== "admin" || getAccessMode(user) !== "full") {
    return forbidden("Admin access required");
  }

  const uploadUrl = decodeHeaderValue(req.headers["x-dtm-upload-url"]);
  if (!uploadUrl) {
    return badRequest("Missing x-dtm-upload-url");
  }

  const uploadMethod = (decodeHeaderValue(req.headers["x-dtm-upload-method"]) || "PUT").toUpperCase();
  const uploadHeaders = parseUploadHeaders(req.headers["x-dtm-upload-headers"]);

  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(uploadUrl);
  } catch {
    return badRequest("Invalid x-dtm-upload-url");
  }

  const upstreamRes = await fetch(upstreamUrl, {
    method: uploadMethod,
    headers: uploadHeaders,
    body: req.bodyBytes ? Buffer.from(req.bodyBytes) : req.bodyText || "",
  });

  const responseHeaders: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || STRIP_RESPONSE_HEADERS.has(normalizedKey)) return;
    responseHeaders[key] = value;
  });

  const result: HttpResult = {
    statusCode: upstreamRes.status,
    headers: responseHeaders,
  };

  const bodyBuffer = Buffer.from(await upstreamRes.arrayBuffer());
  result.body = bodyBuffer.length > 0 ? bodyBuffer.toString("base64") : "";
  result.isBase64Encoded = true;

  if (clearCookie) {
    result.multiValueHeaders = { "set-cookie": [clearSessionCookie()] };
  }

  return result;
}
