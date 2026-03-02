const DEFAULT_LOCAL_SNAPSHOT = "/data/snapshot.example.json";

export function getApiBaseUrl(): string | null {
  const v = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return v && v.trim().length ? v.trim() : null;
}

export async function fetchSnapshot(): Promise<any> {
  const base = getApiBaseUrl();
  const url = base ? `${base.replace(/\/$/, "")}/snapshot` : DEFAULT_LOCAL_SNAPSHOT;
  const res = await fetch(url, {
    headers: {
      "accept": "application/json"
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.json();
}
