import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";
import type { SessionClaims } from "../types";

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(input: string): string {
  const cfg = getAuthRuntimeConfig();
  return createHmac("sha256", cfg.sessionSigningSecret).update(input).digest("base64url");
}

function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const rawPart of (cookieHeader ?? "").split(";")) {
    const [rawName, ...rawValue] = rawPart.trim().split("=");
    if (!rawName) continue;
    cookies[rawName] = rawValue.join("=");
  }
  return cookies;
}

export function issueSessionCookie(claims: SessionClaims): string {
  const cfg = getAuthRuntimeConfig();
  const payload = base64urlEncode(JSON.stringify(claims));
  const sig = sign(payload);
  const sameSite = `SameSite=${cfg.cookieSameSite}`;
  const secure = cfg.cookieSecure ? "; Secure" : "";
  const maxAge = `Max-Age=${cfg.sessionTtlSeconds}`;
  return `${cfg.cookieName}=${payload}.${sig}; HttpOnly; Path=${cfg.cookiePath}; ${maxAge}; ${sameSite}${secure}`;
}

export function clearSessionCookie(): string {
  const cfg = getAuthRuntimeConfig();
  const sameSite = `SameSite=${cfg.cookieSameSite}`;
  const secure = cfg.cookieSecure ? "; Secure" : "";
  return `${cfg.cookieName}=; HttpOnly; Path=${cfg.cookiePath}; Max-Age=0; ${sameSite}${secure}`;
}

export function readSessionClaims(cookieHeader: string | undefined): SessionClaims | null {
  const cfg = getAuthRuntimeConfig();
  const cookies = parseCookieHeader(cookieHeader);
  const raw = cookies[cfg.cookieName];
  if (!raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expectedSig = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSig);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const claims = JSON.parse(base64urlDecode(payload)) as SessionClaims;
    if (!claims || typeof claims !== "object") return null;
    if (Date.now() >= claims.exp * 1000) return null;
    return claims;
  } catch {
    return null;
  }
}
