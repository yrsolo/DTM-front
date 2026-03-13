import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";

type OAuthStatePayload = {
  state: string;
  returnTo: string;
  popup: boolean;
  iat: number;
};

const TTL_SECONDS = 600;

function getOAuthStateCookieName(): string {
  const cfg = getAuthRuntimeConfig();
  return `${cfg.cookieName}_oauth_state`;
}

function base64urlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64urlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string): string {
  const cfg = getAuthRuntimeConfig();
  return createHmac("sha256", cfg.sessionSigningSecret).update(`oauth:${payload}`).digest("base64url");
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

export function createOAuthStateCookie(returnTo: string, popup: boolean): { cookie: string; state: string } {
  const cfg = getAuthRuntimeConfig();
  const payload: OAuthStatePayload = {
    state: randomBytes(18).toString("base64url"),
    returnTo,
    popup,
    iat: Math.floor(Date.now() / 1000),
  };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const sig = sign(encoded);
  const secure = cfg.cookieSecure ? "; Secure" : "";
  const cookie = `${getOAuthStateCookieName()}=${encoded}.${sig}; HttpOnly; Path=${cfg.authBasePath}; Max-Age=${TTL_SECONDS}; SameSite=Lax${secure}`;
  return { cookie, state: payload.state };
}

export function readOAuthState(cookieHeader: string | undefined): OAuthStatePayload | null {
  const cookies = parseCookieHeader(cookieHeader);
  const raw = cookies[getOAuthStateCookieName()];
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
    const decoded = JSON.parse(base64urlDecode(payload)) as OAuthStatePayload;
    if (!decoded?.state || !decoded?.returnTo || !decoded?.iat || typeof decoded.popup !== "boolean") return null;
    if (Math.floor(Date.now() / 1000) - decoded.iat > TTL_SECONDS) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function clearOAuthStateCookie(): string {
  const cfg = getAuthRuntimeConfig();
  const secure = cfg.cookieSecure ? "; Secure" : "";
  return `${getOAuthStateCookieName()}=; HttpOnly; Path=${cfg.authBasePath}; Max-Age=0; SameSite=Lax${secure}`;
}
