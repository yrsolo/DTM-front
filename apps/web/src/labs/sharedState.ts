import { getAuthRequestBase } from "../config/runtimeContour";

export const SHARED_LAB_STATE_IDS = {
  analyticsConfig: "analytics-config",
  designerSortConfig: "designer-sort-config",
  taskFormatConfig: "task-format-config",
  sharedAnalyticsSnapshot: "shared-analytics-snapshot",
} as const;

export type SharedLabStateId = (typeof SHARED_LAB_STATE_IDS)[keyof typeof SHARED_LAB_STATE_IDS];

export function stableClone<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stableClone(item)) as T;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, stableClone(record[key])] as const);
    return Object.fromEntries(entries) as T;
  }
  return value;
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(stableClone(value));
}

type SharedLabStateResponse<T> = {
  id: SharedLabStateId;
  exists: boolean;
  updatedAt: string | null;
  value: T | null;
};

export async function loadSharedLabState<T>(stateId: SharedLabStateId): Promise<SharedLabStateResponse<T>> {
  const response = await fetch(`${getAuthRequestBase()}/app-state/${stateId}`, {
    credentials: "include",
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as SharedLabStateResponse<T>;
}

export async function saveSharedLabState<T>(stateId: SharedLabStateId, value: T): Promise<{
  changed: boolean;
  updatedAt: string | null;
}> {
  const response = await fetch(`${getAuthRequestBase()}/app-state/${stateId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ value }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const payload = (await response.json()) as { changed?: boolean; updatedAt?: string | null };
  return {
    changed: Boolean(payload.changed),
    updatedAt: payload.updatedAt ?? null,
  };
}
