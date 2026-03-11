import { loadPublicConfig } from "../config/publicConfig";
import { resolvePublicAssetUrl } from "../config/publicPaths";
import { getApiProxyRequestBase, isLocalFrontendRuntime } from "../config/runtimeContour";
import { isMaskingForced } from "../auth/maskingMode";

const MIN_API_INTERVAL_MS = 5000;
let apiRateChain: Promise<void> = Promise.resolve();
let lastApiCallAt = 0;

async function runWithApiRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  let release: () => void = () => {};
  const prev = apiRateChain;
  apiRateChain = new Promise<void>((resolve) => {
    release = resolve;
  });

  await prev;
  const now = Date.now();
  const waitMs = Math.max(0, MIN_API_INTERVAL_MS - (now - lastApiCallAt));
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  lastApiCallAt = Date.now();
  try {
    return await fn();
  } finally {
    release();
  }
}

function buildApiUrl(baseUrl: string, path: string, params: URLSearchParams): string {
  const normalizedPath = path.replace(/^\/+/, "");
  const url = new URL(normalizedPath, `${baseUrl.replace(/\/+$/, "")}/`);
  url.search = params.toString();
  return url.toString();
}

function resolveBrowserApiBase(cfg: Awaited<ReturnType<typeof loadPublicConfig>>): string | null {
  if (typeof window === "undefined") {
    return cfg.apiBaseUrlProd || cfg.apiBaseUrlTest || cfg.apiBaseUrl;
  }
  return getApiProxyRequestBase();
}

function shouldIncludeCredentials(baseUrl: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const base = new URL(baseUrl, window.location.origin);
    if (base.origin === window.location.origin) return true;
    if (isLocalFrontendRuntime()) return false;
    if (
      base.origin === "https://dtm.solofarm.ru" &&
      (base.pathname.startsWith("/test/ops/api") || base.pathname.startsWith("/ops/api"))
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function resolveApiCredentials(baseUrl: string): RequestCredentials {
  if (isMaskingForced()) {
    return "omit";
  }
  return shouldIncludeCredentials(baseUrl) ? "include" : "same-origin";
}

export async function fetchSnapshot(): Promise<any> {
  return fetchLocalSnapshot();
}

export type ApiSnapshotFetchResult = {
  payload: any | null;
  notModified: boolean;
  etag: string | null;
};

export type ApiWindowFilter = {
  enabled: boolean;
  start: string;
  end: string;
};

export type ApiStatusFilter = {
  work: boolean;
  preDone: boolean;
  done: boolean;
  wait: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchLocalSnapshot(): Promise<any> {
  const cfg = await loadPublicConfig();
  const res = await fetch(cfg.localSnapshotPath, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${cfg.localSnapshotPath}`);
  return await res.json();
}

export async function fetchDemoSnapshot(): Promise<any> {
  const demoPath = resolvePublicAssetUrl("data/snapshot.test.json");
  const res = await fetch(demoPath, {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${demoPath}`);
  return await res.json();
}

export async function fetchApiSnapshot(): Promise<any> {
  const result = await fetchApiSnapshotWithMeta();
  return result.payload;
}

export async function isApiConfigured(): Promise<boolean> {
  const cfg = await loadPublicConfig();
  return Boolean(resolveBrowserApiBase(cfg));
}

export async function fetchApiSnapshotWithMeta(
  lastEtag?: string | null,
  windowFilter?: ApiWindowFilter,
  statusFilter?: ApiStatusFilter,
  loadLimit?: number,
  apiBaseUrlOverride?: string | null
): Promise<ApiSnapshotFetchResult> {
  const cfg = await loadPublicConfig();
  const apiBaseUrl =
    (apiBaseUrlOverride ?? "").trim() || resolveBrowserApiBase(cfg);
  if (!apiBaseUrl) {
    throw new Error("API base URL is not configured. Set api_base_url in public config.");
  }

  const selectedStatuses = [
    statusFilter?.work ? "work" : null,
    statusFilter?.preDone ? "pre_done" : null,
    statusFilter?.done ? "done" : null,
    statusFilter?.wait ? "wait" : null,
  ].filter(Boolean) as string[];

  const statuses = selectedStatuses.length ? selectedStatuses.join(",") : "work,pre_done";

  // Query limit is bound to UI load-limit control.
  // If for some reason loadLimit is invalid, fall back to a safe default (30), not config.
  const effectiveLimit =
    Number.isFinite(loadLimit) && Number(loadLimit) > 0
      ? Math.max(1, Math.min(1000, Math.floor(Number(loadLimit))))
      : 30;

  const params = new URLSearchParams({
    statuses,
    include_people: String(cfg.apiIncludePeople),
    limit: String(effectiveLimit),
  });
  if (windowFilter?.enabled) {
    params.set("window_start", windowFilter.start);
    params.set("window_end", windowFilter.end);
    params.set("window_mode", "intersects");
  }

  const url = buildApiUrl(apiBaseUrl, cfg.apiFrontendPath, params);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= cfg.apiRetryCount; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, cfg.apiTimeoutMs));

    try {
      const credentials = resolveApiCredentials(apiBaseUrl);
      const res = await runWithApiRateLimit(() =>
        fetch(url, {
          headers: {
            accept: "application/json",
            ...(lastEtag ? { "If-None-Match": lastEtag } : {}),
          },
          credentials,
          signal: controller.signal,
        })
      );

      if (res.status === 304) {
        return { payload: null, notModified: true, etag: lastEtag ?? null };
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }

      const payload = await res.json();
      const etag = res.headers.get("ETag");
      return { payload, notModified: false, etag };
    } catch (error) {
      lastError = error;
      if (import.meta.env.DEV) {
        const reason =
          error instanceof DOMException && error.name === "AbortError"
            ? "timeout/abort"
            : "network/http";
        console.debug("[snapshot.fetch] attempt_failed", {
          attempt: attempt + 1,
          maxAttempts: cfg.apiRetryCount + 1,
          reason,
        });
      }
      if (attempt < cfg.apiRetryCount) {
        await sleep(Math.max(100, cfg.apiRetryDelayMs));
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to fetch API snapshot");
}

export async function fetchPersonNameByOwnerId(ownerId: string): Promise<string | null> {
  const cfg = await loadPublicConfig();
  const apiBaseUrl = resolveBrowserApiBase(cfg);
  if (!apiBaseUrl || !ownerId) return null;

  const path = `${cfg.apiFrontendPath.replace(/^\/+/, "").replace(/\/$/, "")}/entities/people/${encodeURIComponent(ownerId)}`;
  const url = new URL(path, `${apiBaseUrl.replace(/\/+$/, "")}/`).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1000, cfg.apiTimeoutMs));

  try {
    const credentials = resolveApiCredentials(apiBaseUrl);
    const res = await runWithApiRateLimit(() =>
      fetch(url, {
        headers: {
          accept: "application/json",
        },
        credentials,
        signal: controller.signal,
      })
    );
    if (!res.ok) return null;

    const payload = await res.json();
    const name = payload?.name ?? payload?.entity?.name ?? null;
    return typeof name === "string" && name.trim() ? name : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
