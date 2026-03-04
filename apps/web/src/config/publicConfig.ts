import rawPublicConfig from "../../config/public.yaml?raw";

type PublicConfig = {
  apiBaseUrl: string | null;
  apiFrontendPath: string;
  apiStatuses: string;
  apiIncludePeople: boolean;
  apiLimit: number;
  localSnapshotPath: string;
};

const DEFAULT_CONFIG: PublicConfig = {
  apiBaseUrl: null,
  apiFrontendPath: "/api/v2/frontend",
  apiStatuses: "work,pre_done",
  apiIncludePeople: true,
  apiLimit: 200,
  localSnapshotPath: "/data/snapshot.example.json",
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

  return {
    apiBaseUrl,
    apiFrontendPath: parsed.api_frontend_path || DEFAULT_CONFIG.apiFrontendPath,
    apiStatuses: parsed.api_statuses || DEFAULT_CONFIG.apiStatuses,
    apiIncludePeople: toBoolean(
      parsed.api_include_people,
      DEFAULT_CONFIG.apiIncludePeople
    ),
    apiLimit: toNumber(parsed.api_limit, DEFAULT_CONFIG.apiLimit),
    localSnapshotPath:
      parsed.local_snapshot_path || DEFAULT_CONFIG.localSnapshotPath,
  };
}

let cachedConfigPromise: Promise<PublicConfig> | null = null;

export async function loadPublicConfig(): Promise<PublicConfig> {
  if (cachedConfigPromise) return cachedConfigPromise;

  cachedConfigPromise = (async () => {
    try {
      const res = await fetch("/config/public.yaml", {
        headers: { accept: "text/yaml,text/plain" },
        cache: "no-store",
      });
      if (res.ok) {
        const yaml = await res.text();
        return buildConfig(parseSimpleYaml(yaml));
      }
    } catch {
      // Runtime config is optional; fallback is applied below.
    }

    return buildConfig(parseSimpleYaml(rawPublicConfig));
  })();

  return cachedConfigPromise;
}
