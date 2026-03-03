const DEFAULT_LOCAL_SNAPSHOT = "/data/snapshot.example.json";

const V2_ENDPOINT = "/api/v2/frontend";
const V2_DEFAULT_PARAMS = "statuses=work,pre_done&include_people=true&limit=200";

export function getApiBaseUrl(): string | null {
  const v = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return v && v.trim().length ? v.trim() : null;
}

export async function fetchSnapshot(): Promise<any> {
  const base = getApiBaseUrl();
  const url = base
    ? `${base.replace(/\/$/, "")}${V2_ENDPOINT}?${V2_DEFAULT_PARAMS}`
    : DEFAULT_LOCAL_SNAPSHOT;
  try {
    const res = await fetch(url, {
      headers: {
        "accept": "application/json"
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  } catch (err) {
    if (base) {
      console.warn("API v2 fetch failed, falling back to local snapshot:", err);
      const fallbackRes = await fetch(DEFAULT_LOCAL_SNAPSHOT);
      if (fallbackRes.ok) return await fallbackRes.json();
    }
    throw err;
  }
}
