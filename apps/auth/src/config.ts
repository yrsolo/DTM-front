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
  browserAuthProxySecret: string;
  adminBootstrapUid: string | null;
  presetBucket: string;
  presetPublicBaseUrl: string;
  presetStorageEndpoint: string;
  presetStorageRegion: string;
  presetAccessKeyId: string | null;
  presetSecretAccessKey: string | null;
};

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

function deriveContourCookieName(baseName: string, contour: Contour): string {
  const suffix = `_${contour}`;
  return baseName.endsWith(suffix) ? baseName : `${baseName}${suffix}`;
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
    yandexClientId: readRequired(yandexClientIdVar),
    yandexClientSecret: readRequired(yandexClientSecretVar),
    sessionSigningSecret: readRequired("SESSION_SIGNING_SECRET"),
    sessionTtlSeconds: readNumber("SESSION_TTL_SECONDS", 60 * 60 * 12),
    cookieName: deriveContourCookieName(readRequired("COOKIE_NAME"), contour),
    cookiePath: process.env.COOKIE_PATH?.trim() || "/",
    cookieSameSite:
      (process.env.COOKIE_SAMESITE?.trim() as "Lax" | "Strict" | "None" | undefined) || "Lax",
    cookieSecure: readBoolean("COOKIE_SECURE", true),
    ydbEndpoint: readRequired("YDB_ENDPOINT"),
    ydbDatabase: readRequired("YDB_DATABASE"),
    browserAuthProxySecret: readRequired("BROWSER_AUTH_PROXY_SECRET"),
    adminBootstrapUid: readOptional("ADMIN_BOOTSTRAP_UID"),
    presetBucket: process.env.PRESET_BUCKET?.trim() || "dtm-presets",
    presetPublicBaseUrl:
      process.env.PRESET_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "") || "https://dtm-presets.website.yandexcloud.net",
    presetStorageEndpoint:
      process.env.PRESET_STORAGE_ENDPOINT?.trim().replace(/\/+$/, "") || "https://storage.yandexcloud.net",
    presetStorageRegion: process.env.PRESET_STORAGE_REGION?.trim() || "ru-central1",
    presetAccessKeyId: readOptional("AWS_ACCESS_KEY_ID"),
    presetSecretAccessKey: readOptional("AWS_SECRET_ACCESS_KEY"),
  };

  return cachedConfig;
}
