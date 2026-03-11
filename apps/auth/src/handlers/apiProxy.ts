import { getAuthRuntimeConfig } from "../config";
import { clearSessionCookie } from "../session/cookieSession";
import { getAccessMode, resolveSession } from "../middleware/auth";
import { maskSnapshotPayload } from "../masking/maskSnapshot";
import type { NormalizedRequest } from "../types";

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

const STRIP_RESPONSE_HEADERS = new Set([
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "vary",
]);

export async function proxyApiRequest(req: NormalizedRequest) {
  const cfg = getAuthRuntimeConfig();
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  const accessMode = getAccessMode(user);
  const forceMasking = req.headers["x-dtm-force-mask"] === "1";
  const effectiveAccessMode = forceMasking ? "masked" : accessMode;

  const upstreamUrl = new URL(
    `${cfg.apiUpstreamOrigin.replace(/\/+$/, "")}${req.routePath}${req.query.toString() ? `?${req.query.toString()}` : ""}`
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP_HEADERS.has(key)) continue;
    if (key === "x-dtm-force-mask") continue;
    headers.set(key, value);
  }
  headers.set("x-dtm-access-mode", effectiveAccessMode);
  headers.set("x-dtm-contour", cfg.contour);

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.bodyBytes ? Buffer.from(req.bodyBytes) : req.bodyText || undefined,
  });

  const responseHeaders: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalizedKey) || STRIP_RESPONSE_HEADERS.has(normalizedKey)) return;
    responseHeaders[key] = value;
  });

  const contentType = upstreamRes.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const result = {
      statusCode: upstreamRes.status,
      headers: responseHeaders,
      body: await upstreamRes.text(),
    };
    return clearCookie ? { ...result, multiValueHeaders: { "set-cookie": [clearSessionCookie()] } } : result;
  }

  const payload = await upstreamRes.json();
  const finalPayload = effectiveAccessMode === "full" ? payload : maskSnapshotPayload(payload, cfg.maskingSalt);
  const result = {
    statusCode: upstreamRes.status,
    headers: responseHeaders,
    body: JSON.stringify(finalPayload),
  };
  return clearCookie ? { ...result, multiValueHeaders: { "set-cookie": [clearSessionCookie()] } } : result;
}
