import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getAuthRuntimeConfig } from "../config";

export type SharedAppStateId =
  | "analytics-config"
  | "designer-sort-config"
  | "task-format-config"
  | "shared-analytics-snapshot";

export type SharedAppStateEnvelope = {
  version: 1;
  updatedAt: string;
  value: unknown;
};

export class SharedAppStateStorageUnavailableError extends Error {
  constructor(message = "Shared app-state storage is unavailable") {
    super(message);
    this.name = "SharedAppStateStorageUnavailableError";
  }
}

const STORAGE_KEY_BY_ID: Record<SharedAppStateId, string> = {
  "analytics-config": "app-state/analytics-config/v1.json",
  "designer-sort-config": "app-state/designer-sort-config/v1.json",
  "task-format-config": "app-state/task-format-config/v1.json",
  "shared-analytics-snapshot": "app-state/shared-analytics-snapshot/v1.json",
};

let cachedClient: S3Client | null = null;

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, "");
}

function canonicalStorageAssetUrl(key: string): string {
  const cfg = getAuthRuntimeConfig();
  return `${trimTrailingSlashes(cfg.presetStorageEndpoint)}/${cfg.presetBucket}/${key}`;
}

function preferredPublicAssetUrl(key: string): string {
  const cfg = getAuthRuntimeConfig();
  return `${trimTrailingSlashes(cfg.presetPublicBaseUrl)}/${key}`;
}

function hasWriteAccess(): boolean {
  const cfg = getAuthRuntimeConfig();
  return Boolean(cfg.presetAccessKeyId && cfg.presetSecretAccessKey);
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const cfg = getAuthRuntimeConfig();
  if (!cfg.presetAccessKeyId || !cfg.presetSecretAccessKey) {
    throw new SharedAppStateStorageUnavailableError("Shared app-state storage credentials are not configured");
  }
  cachedClient = new S3Client({
    region: cfg.presetStorageRegion,
    endpoint: cfg.presetStorageEndpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: cfg.presetAccessKeyId,
      secretAccessKey: cfg.presetSecretAccessKey,
    },
  });
  return cachedClient;
}

function normalizeStateId(value: string): SharedAppStateId | null {
  if (value === "analytics-config") return value;
  if (value === "designer-sort-config") return value;
  if (value === "task-format-config") return value;
  if (value === "shared-analytics-snapshot") return value;
  return null;
}

function stableClone(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableClone(item));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const entries = Object.keys(record)
      .sort((left, right) => left.localeCompare(right))
      .map((key) => [key, stableClone(record[key])] as const);
    return Object.fromEntries(entries);
  }
  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableClone(value));
}

async function readObjectText(key: string): Promise<string | null> {
  if (hasWriteAccess()) {
    try {
      const cfg = getAuthRuntimeConfig();
      const object = await getClient().send(
        new GetObjectCommand({
          Bucket: cfg.presetBucket,
          Key: key,
        })
      );
      if (object.Body) {
        return await object.Body.transformToString();
      }
    } catch {
      // fallback to public reads below
    }
  }

  const urls = [preferredPublicAssetUrl(key), canonicalStorageAssetUrl(key)];
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) return await res.text();
    } catch {
      // continue to next URL candidate
    }
  }

  return null;
}

async function writeObjectJson(key: string, payload: unknown): Promise<void> {
  const cfg = getAuthRuntimeConfig();
  await getClient().send(
    new PutObjectCommand({
      Bucket: cfg.presetBucket,
      Key: key,
      Body: JSON.stringify(payload, null, 2),
      ContentType: "application/json; charset=utf-8",
      CacheControl: "public, max-age=60",
    })
  );
}

function normalizeEnvelope(input: unknown): SharedAppStateEnvelope | null {
  if (!input || typeof input !== "object") return null;
  const record = input as Record<string, unknown>;
  if (Number(record.version) !== 1) return null;
  return {
    version: 1,
    updatedAt:
      typeof record.updatedAt === "string" && record.updatedAt.trim()
        ? record.updatedAt
        : new Date(0).toISOString(),
    value: record.value ?? null,
  };
}

export function parseSharedAppStateId(value: string): SharedAppStateId | null {
  return normalizeStateId(value);
}

export async function readSharedAppState(stateId: SharedAppStateId): Promise<SharedAppStateEnvelope | null> {
  const key = STORAGE_KEY_BY_ID[stateId];
  const raw = await readObjectText(key);
  if (!raw) return null;
  try {
    return normalizeEnvelope(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeSharedAppState(stateId: SharedAppStateId, value: unknown): Promise<{
  changed: boolean;
  updatedAt: string;
}> {
  if (!hasWriteAccess()) {
    throw new SharedAppStateStorageUnavailableError("Shared app-state storage is read-only");
  }

  const current = await readSharedAppState(stateId);
  const nextSerialized = stableStringify(value);
  const currentSerialized = current ? stableStringify(current.value) : null;
  const updatedAt = new Date().toISOString();

  if (currentSerialized === nextSerialized) {
    return { changed: false, updatedAt: current.updatedAt };
  }

  await writeObjectJson(STORAGE_KEY_BY_ID[stateId], {
    version: 1,
    updatedAt,
    value,
  } satisfies SharedAppStateEnvelope);

  return { changed: true, updatedAt };
}
