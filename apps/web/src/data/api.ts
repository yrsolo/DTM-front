import { getPublicConfig } from "../config/publicConfig";

function buildApiUrl(baseUrl: string, path: string, params: URLSearchParams): string {
  const url = new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
  url.search = params.toString();
  return url.toString();
}

export async function fetchSnapshot(): Promise<any> {
  const cfg = getPublicConfig();
  const params = new URLSearchParams({
    statuses: cfg.apiStatuses,
    include_people: String(cfg.apiIncludePeople),
    limit: String(cfg.apiLimit),
  });
  const url = cfg.apiBaseUrl
    ? buildApiUrl(cfg.apiBaseUrl, cfg.apiFrontendPath, params)
    : cfg.localSnapshotPath;

  try {
    const res = await fetch(url, {
      headers: {
        accept: "application/json",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (err) {
    if (cfg.apiBaseUrl) {
      console.warn("API v2 fetch failed, falling back to local snapshot:", err);
      const fallbackRes = await fetch(cfg.localSnapshotPath);
      if (fallbackRes.ok) return await fallbackRes.json();
    }
    throw err;
  }
}
