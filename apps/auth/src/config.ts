import type { Contour } from "./types";

export type AuthRuntimeConfig = {
  contour: Contour;
  baseUrl: string;
  authBasePath: string;
  apiProxyBasePath: string;
  apiUpstreamOrigin: string;
  yandexClientId: string;
  yandexClientSecret: string;
  sessionSigningSecret: string;
  sessionTtlSeconds: number;
  cookieName: string;
  cookiePath: string;
  cookieSameSite: "Lax" | "Strict" | "None";
  cookieSecure: boolean;
  ydbEndpoint: string;
  ydbDatabase: string;
  maskingSalt: string;
  adminBootstrapUid: string | null;
};

function readRequiredAny(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  throw new Error(`Missing required env: ${names.join(" or ")}`);
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

function readOptional(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

function readContour(): Contour {
  const value = (process.env.CONTOUR ?? "").trim().toLowerCase();
  if (value === "test" || value === "prod") return value;
  throw new Error("Missing or invalid env: CONTOUR");
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return fallback;
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

let cachedConfig: AuthRuntimeConfig | null = null;

export function getAuthRuntimeConfig(): AuthRuntimeConfig {
  if (cachedConfig) return cachedConfig;

  const contour = readContour();
  const baseUrl = readRequired("BASE_URL").replace(/\/+$/, "");
  const authBasePath = readRequired("AUTH_BASE_PATH");
  const apiProxyBasePath = readRequired("API_PROXY_BASE_PATH");
  const apiUpstreamOrigin = readRequired("API_UPSTREAM_ORIGIN").replace(/\/+$/, "");
  const yandexClientIdVar = contour === "test" ? "YANDEX_CLIENT_ID_TEST" : "YANDEX_CLIENT_ID_PROD";
  const yandexClientSecretVar =
    contour === "test" ? "YANDEX_CLIENT_SECRET_TEST" : "YANDEX_CLIENT_SECRET_PROD";

  cachedConfig = {
    contour,
    baseUrl,
    authBasePath,
    apiProxyBasePath,
    apiUpstreamOrigin,
    yandexClientId: readRequiredAny(yandexClientIdVar, "YANDEX_CLIENT_ID"),
    yandexClientSecret: readRequiredAny(yandexClientSecretVar, "YANDEX_CLIENT_SECRET"),
    sessionSigningSecret: readRequired("SESSION_SIGNING_SECRET"),
    sessionTtlSeconds: readNumber("SESSION_TTL_SECONDS", 60 * 60 * 12),
    cookieName: readRequired("COOKIE_NAME"),
    cookiePath: process.env.COOKIE_PATH?.trim() || "/",
    cookieSameSite:
      (process.env.COOKIE_SAMESITE?.trim() as "Lax" | "Strict" | "None" | undefined) || "Lax",
    cookieSecure: readBoolean("COOKIE_SECURE", true),
    ydbEndpoint: readRequired("YDB_ENDPOINT"),
    ydbDatabase: readRequired("YDB_DATABASE"),
    maskingSalt: readRequired("MASKING_SALT"),
    adminBootstrapUid: readOptional("ADMIN_BOOTSTRAP_UID"),
  };

  return cachedConfig;
}
