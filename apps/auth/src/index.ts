import { getAuthRuntimeConfig } from "./config";
import { internalError, makeRequestId, normalizeHeaders } from "./http";
import { routeRequest } from "./router";
import type { Contour, HttpResult, NormalizedRequest } from "./types";

type YcHttpEvent = {
  httpMethod?: string;
  url?: string;
  path?: string;
  rawPath?: string;
  headers?: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined>;
  pathParameters?: Record<string, string | undefined>;
  pathParams?: Record<string, string | undefined>;
  params?: {
    path?: Record<string, string | undefined>;
  };
  requestContext?: {
    path?: string;
    http?: {
      path?: string;
    };
  };
  body?: string | null;
  isBase64Encoded?: boolean;
};

function resolveEventPath(event: YcHttpEvent): string {
  const candidates = [
    event.url,
    event.requestContext?.http?.path,
    event.requestContext?.path,
    event.rawPath,
    event.path,
  ];

  let resolved = candidates.find((value) => typeof value === "string" && value.trim()) || "/";
  const proxyParam =
    event.pathParameters?.proxy ??
    event.pathParameters?.path ??
    event.pathParams?.proxy ??
    event.pathParams?.path ??
    event.params?.path?.proxy ??
    event.params?.path?.path;

  if (proxyParam) {
    resolved = resolved
      .replace("{proxy+}", proxyParam)
      .replace("{path+}", proxyParam);
  }

  return resolved.split("?")[0] || "/";
}

function contourFromPath(pathname: string): { contour: Contour; routeKind: "auth" | "api"; routePath: string } {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/test/auth" || normalized.startsWith("/test/auth/")) {
    return {
      contour: "test",
      routeKind: "auth",
      routePath: normalized.slice("/test/auth".length) || "/",
    };
  }
  if (normalized === "/test/api" || normalized.startsWith("/test/api/")) {
    return {
      contour: "test",
      routeKind: "api",
      routePath: normalized.slice("/test/api".length) || "/",
    };
  }
  if (normalized === "/prod/auth" || normalized.startsWith("/prod/auth/")) {
    return {
      contour: "prod",
      routeKind: "auth",
      routePath: normalized.slice("/prod/auth".length) || "/",
    };
  }
  if (normalized === "/prod/api" || normalized.startsWith("/prod/api/")) {
    return {
      contour: "prod",
      routeKind: "api",
      routePath: normalized.slice("/prod/api".length) || "/",
    };
  }

  throw new Error(`Unsupported path prefix: ${pathname}`);
}

function normalizeRequest(event: YcHttpEvent): NormalizedRequest {
  const headers = normalizeHeaders(event.headers);
  const method = (event.httpMethod || "GET").toUpperCase();
  const originalPath = resolveEventPath(event);
  const { contour, routeKind, routePath } = contourFromPath(originalPath);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(event.queryStringParameters ?? {})) {
    if (typeof value === "string") query.set(key, value);
  }

  const bodyText = event.body ?? "";
  const bodyBytes =
    bodyText.length > 0
      ? event.isBase64Encoded
        ? Uint8Array.from(Buffer.from(bodyText, "base64"))
        : Uint8Array.from(Buffer.from(bodyText))
      : null;

  return {
    method,
    originalPath,
    routePath,
    contour,
    routeKind,
    headers,
    query,
    bodyText,
    bodyBytes,
    isBase64Encoded: Boolean(event.isBase64Encoded),
    requestId: makeRequestId(headers),
    origin: headers.origin || "",
  };
}

function withCorsHeaders(result: HttpResult): HttpResult {
  const origin = result.headers?.["x-dtm-cors-origin"] ?? "";
  const allowCredentials = origin
    ? origin.startsWith("http://localhost:") ||
      origin.startsWith("http://127.0.0.1:") ||
      origin.startsWith("http://[::1]:") ||
      origin.startsWith("https://dtm.solofarm.ru")
    : false;

  const nextHeaders = { ...(result.headers ?? {}) };
  delete nextHeaders["x-dtm-cors-origin"];

  return {
    ...result,
    headers: {
      "access-control-allow-origin": allowCredentials ? origin : "*",
      "access-control-allow-headers": "content-type,x-request-id",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      ...(allowCredentials
        ? {
            "access-control-allow-credentials": "true",
            vary: "Origin",
          }
        : {}),
      ...nextHeaders,
    },
  };
}

export async function handler(event: YcHttpEvent): Promise<HttpResult> {
  try {
    const cfg = getAuthRuntimeConfig();
    const req = normalizeRequest(event);
    if (req.contour !== cfg.contour) {
      return withCorsHeaders({
        statusCode: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Contour mismatch" }),
      });
    }

    if (req.method === "OPTIONS") {
      return withCorsHeaders({
        statusCode: 204,
        body: "",
        headers: req.origin ? { "x-dtm-cors-origin": req.origin } : undefined,
      });
    }

    const result = await routeRequest(req);
    return withCorsHeaders({
      ...result,
      headers: {
        ...(result.headers ?? {}),
        ...(req.origin ? { "x-dtm-cors-origin": req.origin } : {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unhandled error";
    return withCorsHeaders(internalError(message));
  }
}
