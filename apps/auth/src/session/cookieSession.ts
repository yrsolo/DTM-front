import { createHmac, timingSafeEqual } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";
import type { DevLocalSessionClaims, SessionClaims, TempLinkSessionClaims, UserSessionClaims } from "../types";

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
    if (cookies[rawName] != null) continue;
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

function isUserClaims(value: unknown): value is UserSessionClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return (
    typeof claims.userId === "string" &&
    typeof claims.yandexUid === "string" &&
    typeof claims.role === "string" &&
    typeof claims.status === "string" &&
    typeof claims.sv === "number" &&
    typeof claims.iat === "number" &&
    typeof claims.exp === "number"
  );
}

function isTempLinkClaims(value: unknown): value is TempLinkSessionClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  return (
    claims.kind === "temp_link" &&
    typeof claims.linkId === "string" &&
    typeof claims.iat === "number" &&
    typeof claims.exp === "number"
  );
}

function isDevLocalClaims(value: unknown): value is DevLocalSessionClaims {
  if (!value || typeof value !== "object") return false;
  const claims = value as Record<string, unknown>;
  if (claims.kind !== "dev_local" || typeof claims.iat !== "number" || typeof claims.exp !== "number") {
    return false;
  }
  if (claims.personaKind === "real_user") {
    return typeof claims.userId === "string" && typeof claims.sv === "number";
  }
  if (claims.personaKind === "synthetic_blocked") {
    return typeof claims.label === "string";
  }
  return false;
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
    if (!isUserClaims(claims) && !isTempLinkClaims(claims) && !isDevLocalClaims(claims)) return null;
    if (Date.now() >= claims.exp * 1000) return null;
    return claims;
  } catch {
    return null;
  }
}
