import { getAuthRuntimeConfig } from "../config";
import { badRequest, serviceUnavailable } from "../http";
import type { HttpResult, NormalizedRequest } from "../types";

const TELEGRAM_SDK_PATH = "/js/telegram-web-app.js";
const STRIP_RESPONSE_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
]);

function normalizeProxyBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function buildTelegramSdkUpstreamUrl(proxyBaseUrl: string): URL {
  const normalized = normalizeProxyBaseUrl(proxyBaseUrl);
  if (normalized.includes("telegram-web-app.js")) {
    return new URL(normalized);
  }
  return new URL(`${normalized}${TELEGRAM_SDK_PATH}?61`);
}

export async function proxyTelegramSdk(req: NormalizedRequest): Promise<HttpResult> {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return badRequest("Telegram SDK proxy supports only GET/HEAD");
  }

  const cfg = getAuthRuntimeConfig();
  if (!cfg.telegramSdkProxyUrl) {
    return serviceUnavailable("Telegram SDK proxy is not configured");
  }

  const upstreamUrl = buildTelegramSdkUpstreamUrl(cfg.telegramSdkProxyUrl);
  const upstreamRes = await fetch(upstreamUrl, {
    method: req.method,
    headers: {
      accept: "application/javascript,text/javascript,*/*;q=0.8",
    },
  });

  const headers: Record<string, string> = {
    "cache-control": upstreamRes.headers.get("cache-control") || "public, max-age=3600, stale-while-revalidate=86400",
    "content-type": upstreamRes.headers.get("content-type") || "application/javascript; charset=utf-8",
  };

  upstreamRes.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (STRIP_RESPONSE_HEADERS.has(normalizedKey)) return;
    if (normalizedKey in headers) return;
    headers[key] = value;
  });

  const arrayBuffer = await upstreamRes.arrayBuffer();
  return {
    statusCode: upstreamRes.status,
    headers,
    body: req.method === "HEAD" ? "" : Buffer.from(arrayBuffer).toString("base64"),
    isBase64Encoded: true,
  };
}
