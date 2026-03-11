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

export async function proxyApiRequest(req: NormalizedRequest) {
  const cfg = getAuthRuntimeConfig();
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  const accessMode = getAccessMode(user);

  const upstreamUrl = new URL(
    `${cfg.apiUpstreamOrigin.replace(/\/+$/, "")}${req.routePath}${req.query.toString() ? `?${req.query.toString()}` : ""}`
  );

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || HOP_BY_HOP_HEADERS.has(key)) continue;
    headers.set(key, value);
  }
  headers.set("x-dtm-access-mode", accessMode);
  headers.set("x-dtm-contour", cfg.contour);

  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req.bodyBytes ? Buffer.from(req.bodyBytes) : req.bodyText || undefined,
  });

  const responseHeaders: Record<string, string> = {};
  upstreamRes.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    responseHeaders[key] = value;
  });
  if (clearCookie) {
    responseHeaders["set-cookie"] = clearSessionCookie();
  }

  const contentType = upstreamRes.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {
      statusCode: upstreamRes.status,
      headers: responseHeaders,
      body: await upstreamRes.text(),
    };
  }

  const payload = await upstreamRes.json();
  const finalPayload = accessMode === "full" ? payload : maskSnapshotPayload(payload, cfg.maskingSalt);
  return {
    statusCode: upstreamRes.status,
    headers: responseHeaders,
    body: JSON.stringify(finalPayload),
  };
}
