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

let cachedConfig: PublicConfig | null = null;

export function getPublicConfig(): PublicConfig {
  if (cachedConfig) return cachedConfig;

  const parsed = parseSimpleYaml(rawPublicConfig);
  const apiBaseUrl = parsed.api_base_url?.trim() || null;

  cachedConfig = {
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

  return cachedConfig;
}
