import { loadPublicConfig } from "../config/publicConfig";

function buildApiUrl(baseUrl: string, path: string, params: URLSearchParams): string {
  const url = new URL(path, `${baseUrl.replace(/\/$/, "")}/`);
  url.search = params.toString();
  return url.toString();
}

export async function fetchSnapshot(): Promise<any> {
  return fetchLocalSnapshot();
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

export async function fetchApiSnapshot(): Promise<any> {
  const cfg = await loadPublicConfig();
  if (!cfg.apiBaseUrl) {
    throw new Error("API base URL is not configured. Set api_base_url in public config.");
  }

  const params = new URLSearchParams({
    statuses: cfg.apiStatuses,
    include_people: String(cfg.apiIncludePeople),
    limit: String(cfg.apiLimit),
  });

  const url = buildApiUrl(cfg.apiBaseUrl, cfg.apiFrontendPath, params);
  const res = await fetch(url, {
    headers: { accept: "application/json" },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}
