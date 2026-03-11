import { randomUUID } from "node:crypto";

import type { HttpResult } from "./types";

export function normalizeHeaders(
  headers: Record<string, string | undefined> | null | undefined
): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string") {
      normalized[key.toLowerCase()] = value;
    }
  }
  return normalized;
}

export function makeRequestId(headers: Record<string, string>): string {
  return headers["x-request-id"]?.trim() || randomUUID();
}

export function json(statusCode: number, payload: unknown, headers?: Record<string, string>): HttpResult {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers,
    },
    body: JSON.stringify(payload),
  };
}

export function text(statusCode: number, body: string, headers?: Record<string, string>): HttpResult {
  return {
    statusCode,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      ...headers,
    },
    body,
  };
}

export function redirect(location: string, headers?: Record<string, string>): HttpResult {
  return {
    statusCode: 302,
    headers: {
      location,
      ...headers,
    },
    body: "",
  };
}

export function badRequest(message: string): HttpResult {
  return json(400, { error: message });
}

export function unauthorized(message = "Unauthorized"): HttpResult {
  return json(401, { error: message });
}

export function forbidden(message = "Forbidden"): HttpResult {
  return json(403, { error: message });
}

export function notFound(message = "Not found"): HttpResult {
  return json(404, { error: message });
}

export function internalError(message = "Internal error"): HttpResult {
  return json(500, { error: message });
}

export function appendSetCookie(
  result: HttpResult,
  cookieValue: string
): HttpResult {
  const nextHeaders = { ...(result.headers ?? {}) };
  const nextMultiValueHeaders = { ...(result.multiValueHeaders ?? {}) };
  const existing = nextMultiValueHeaders["set-cookie"] ?? [];
  nextMultiValueHeaders["set-cookie"] = [...existing, cookieValue];

  delete nextHeaders["set-cookie"];

  return {
    ...result,
    headers: nextHeaders,
    multiValueHeaders: nextMultiValueHeaders,
  };
}
