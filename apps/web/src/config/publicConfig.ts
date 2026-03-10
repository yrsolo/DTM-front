import rawPublicConfig from "../../config/public.yaml?raw";
import rawPublicConfigProd from "../../config/public.prod.yaml?raw";
import { resolvePublicAssetUrl } from "./publicPaths";

type PublicConfig = {
  apiBaseUrl: string | null;
  apiBaseUrlProd: string | null;
  apiBaseUrlTest: string | null;
  apiFrontendPath: string;
  apiStatuses: string;
  apiIncludePeople: boolean;
  apiLimit: number;
  apiTimeoutMs: number;
  apiRetryCount: number;
  apiRetryDelayMs: number;
  apiRefreshIntervalMs: number;
  localSnapshotPath: string;
};

const DEFAULT_CONFIG: PublicConfig = {
  apiBaseUrl: null,
  apiBaseUrlProd: null,
  apiBaseUrlTest: null,
  apiFrontendPath: "/api/v2/frontend",
  apiStatuses: "work,pre_done",
  apiIncludePeople: true,
  apiLimit: 200,
  apiTimeoutMs: 12000,
  apiRetryCount: 1,
  apiRetryDelayMs: 500,
  apiRefreshIntervalMs: 60000,
  localSnapshotPath: "data/snapshot.example.json",
};

function parseSimpleYaml(yaml: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = yaml.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const sepIndex = trimmed.indexOf(":");
    if (sepIndex <= 0) continue;

    const key = trimmed.slice(0, sepIndex).trim();
    let value = trimmed.slice(sepIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

function toBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function toNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildConfig(parsed: Record<string, string>): PublicConfig {
  const apiBaseUrl = parsed.api_base_url?.trim() || null;
  const apiBaseUrlProd = parsed.api_base_url_prod?.trim() || apiBaseUrl;
  const apiBaseUrlTest = parsed.api_base_url_test?.trim() || apiBaseUrl;

  return {
    apiBaseUrl,
    apiBaseUrlProd,
    apiBaseUrlTest,
    apiFrontendPath: parsed.api_frontend_path || DEFAULT_CONFIG.apiFrontendPath,
    apiStatuses: parsed.api_statuses || DEFAULT_CONFIG.apiStatuses,
    apiIncludePeople: toBoolean(
      parsed.api_include_people,
      DEFAULT_CONFIG.apiIncludePeople
    ),
    apiLimit: toNumber(parsed.api_limit, DEFAULT_CONFIG.apiLimit),
    apiTimeoutMs: toNumber(parsed.api_timeout_ms, DEFAULT_CONFIG.apiTimeoutMs),
    apiRetryCount: toNumber(parsed.api_retry_count, DEFAULT_CONFIG.apiRetryCount),
    apiRetryDelayMs: toNumber(parsed.api_retry_delay_ms, DEFAULT_CONFIG.apiRetryDelayMs),
    apiRefreshIntervalMs: toNumber(
      parsed.api_refresh_interval_ms,
      DEFAULT_CONFIG.apiRefreshIntervalMs
    ),
    localSnapshotPath:
      parsed.local_snapshot_path || DEFAULT_CONFIG.localSnapshotPath,
  };
}

function pickFallbackYaml(): string {
  if (typeof window === "undefined") return rawPublicConfig;
  const host = window.location.hostname.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local");
  const isTestRuntime = path === "/test" || path.startsWith("/test/");
  if (isLocal || isTestRuntime) return rawPublicConfig;
  return rawPublicConfigProd;
}

let cachedConfigPromise: Promise<PublicConfig> | null = null;

export async function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = (async () => {
    try {
      const paths = [
        resolvePublicAssetUrl("config/public.yaml"),
        resolvePublicAssetUrl("config/public.yam"),
      ];
      for (const path of paths) {
        const res = await fetch(path, {
          headers: { accept: "text/yaml,text/plain" },
          cache: "no-store",
        });
        if (res.ok) {
          const yaml = await res.text();
          return buildConfig(parseSimpleYaml(yaml));
        }
      }
    } catch {
      // Runtime config is optional; fallback is applied below.
    }

    return buildConfig(parseSimpleYaml(pickFallbackYaml()));
  })();

  return cachedConfigPromise;
}
