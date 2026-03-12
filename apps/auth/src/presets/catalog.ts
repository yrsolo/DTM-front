import { randomUUID } from "node:crypto";

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { getAuthRuntimeConfig } from "../config";
import type { AuthUser } from "../types";

export type PresetKind = "color" | "layout";
export type PresetAvailability = "ready" | "broken" | "unavailable";

export type PresetCatalogEntry = {
  id: string;
  kind: PresetKind;
  name: string;
  description: string | null;
  authorUserId: string;
  authorDisplayName: string | null;
  storageKey: string;
  storageUrl: string;
  revision: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

type PresetCatalog = {
  version: 1;
  defaults: Record<PresetKind, string | null>;
  presets: PresetCatalogEntry[];
};

type PresetPayloadRecord = Record<string, unknown>;

const CATALOG_KEY = "catalog/index.json";

let cachedClient: S3Client | null = null;

function hasPresetWriteAccess(): boolean {
  const cfg = getAuthRuntimeConfig();
  return Boolean(cfg.presetAccessKeyId && cfg.presetSecretAccessKey);
}

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const cfg = getAuthRuntimeConfig();
  if (!cfg.presetAccessKeyId || !cfg.presetSecretAccessKey) {
    throw new Error("Preset storage credentials are not configured");
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

function emptyCatalog(): PresetCatalog {
  return {
    version: 1,
    defaults: { color: null, layout: null },
    presets: [],
  };
}

async function readObjectText(key: string): Promise<string | null> {
  const cfg = getAuthRuntimeConfig();
  const publicUrl = `${cfg.presetPublicBaseUrl}/${key}`;

  try {
    const res = await fetch(publicUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (res.ok) return await res.text();
  } catch {
    // fallback to signed read below
  }

  if (!hasPresetWriteAccess()) return null;

  try {
    const object = await getClient().send(
      new GetObjectCommand({
        Bucket: cfg.presetBucket,
        Key: key,
      })
    );
    if (!object.Body) return null;
    return await object.Body.transformToString();
  } catch {
    return null;
  }
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

function publicAssetUrl(key: string): string {
  const cfg = getAuthRuntimeConfig();
  return `${cfg.presetPublicBaseUrl}/${key}`;
}

function normalizeCatalog(input: unknown): PresetCatalog {
  if (!input || typeof input !== "object") return emptyCatalog();
  const record = input as Record<string, unknown>;
  const defaultsRecord =
    record.defaults && typeof record.defaults === "object" ? (record.defaults as Record<string, unknown>) : {};
  const presets = Array.isArray(record.presets)
    ? record.presets
        .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
        .map((item) => ({
          id: String(item.id || randomUUID()),
          kind: item.kind === "color" ? "color" : "layout",
          name: String(item.name || "Untitled preset"),
          description: typeof item.description === "string" ? item.description : null,
          authorUserId: String(item.authorUserId || ""),
          authorDisplayName: typeof item.authorDisplayName === "string" ? item.authorDisplayName : null,
          storageKey: String(item.storageKey || ""),
          storageUrl: String(item.storageUrl || publicAssetUrl(String(item.storageKey || ""))),
          revision: Number.isFinite(Number(item.revision)) ? Number(item.revision) : 1,
          isDeleted: Boolean(item.isDeleted),
          createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString(),
        }))
    : [];

  return {
    version: 1,
    defaults: {
      color: typeof defaultsRecord.color === "string" ? defaultsRecord.color : null,
      layout: typeof defaultsRecord.layout === "string" ? defaultsRecord.layout : null,
    },
    presets,
  };
}

export async function readPresetCatalog(): Promise<PresetCatalog> {
  const raw = await readObjectText(CATALOG_KEY);
  if (!raw) return emptyCatalog();
  try {
    return normalizeCatalog(JSON.parse(raw));
  } catch {
    return emptyCatalog();
  }
}

async function writePresetCatalog(catalog: PresetCatalog): Promise<void> {
  if (!hasPresetWriteAccess()) {
    throw new Error("Preset storage is read-only");
  }
  await writeObjectJson(CATALOG_KEY, catalog);
}

function buildStorageKey(kind: PresetKind, presetId: string, revision: number): string {
  return `${kind === "color" ? "colors" : "layouts"}/${presetId}/${revision}.json`;
}

async function writePresetPayload(key: string, payload: PresetPayloadRecord): Promise<void> {
  if (!hasPresetWriteAccess()) {
    throw new Error("Preset storage is read-only");
  }
  await writeObjectJson(key, payload);
}

export function canManagePreset(user: AuthUser, entry: PresetCatalogEntry): boolean {
  return user.role === "admin" || entry.authorUserId === user.id;
}

export function canCreatePreset(user: AuthUser): boolean {
  return user.status === "approved";
}

export async function listPresetEntries(kind: PresetKind, user: AuthUser | null) {
  const catalog = await readPresetCatalog();
  const items = catalog.presets.filter((item) => item.kind === kind && !item.isDeleted);
  const availability = await Promise.all(
    items.map(async (item) => {
      try {
        if (hasPresetWriteAccess()) {
          const cfg = getAuthRuntimeConfig();
          await getClient().send(
            new HeadObjectCommand({
              Bucket: cfg.presetBucket,
              Key: item.storageKey,
            })
          );
          return [item.id, "ready"] as const;
        }
        const res = await fetch(item.storageUrl, { method: "HEAD", cache: "no-store" });
        return [item.id, res.ok ? "ready" : "broken"] as const;
      } catch {
        return [item.id, "unavailable"] as const;
      }
    })
  );
  const availabilityById = new Map(availability);

  return {
    defaults: catalog.defaults,
    presets: items.map((item) => ({
      ...item,
      canEdit: user ? canManagePreset(user, item) : false,
      availability: availabilityById.get(item.id) ?? "unavailable",
    })),
  };
}

export async function createPreset(params: {
  kind: PresetKind;
  name: string;
  description?: string | null;
  payload: PresetPayloadRecord;
  actor: AuthUser;
}) {
  const catalog = await readPresetCatalog();
  const id = randomUUID();
  const revision = 1;
  const now = new Date().toISOString();
  const storageKey = buildStorageKey(params.kind, id, revision);
  const entry: PresetCatalogEntry = {
    id,
    kind: params.kind,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    authorUserId: params.actor.id,
    authorDisplayName: params.actor.displayName || params.actor.email,
    storageKey,
    storageUrl: publicAssetUrl(storageKey),
    revision,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await writePresetPayload(storageKey, params.payload);
  await writePresetCatalog({
    ...catalog,
    presets: [...catalog.presets.filter((item) => item.id !== id), entry],
  });
  return entry;
}

export async function updatePreset(params: {
  entry: PresetCatalogEntry;
  name: string;
  description?: string | null;
  payload: PresetPayloadRecord;
}) {
  const catalog = await readPresetCatalog();
  const revision = params.entry.revision + 1;
  const storageKey = buildStorageKey(params.entry.kind, params.entry.id, revision);
  const updated: PresetCatalogEntry = {
    ...params.entry,
    name: params.name.trim(),
    description: params.description?.trim() || null,
    revision,
    updatedAt: new Date().toISOString(),
    storageKey,
    storageUrl: publicAssetUrl(storageKey),
  };

  await writePresetPayload(storageKey, params.payload);
  await writePresetCatalog({
    ...catalog,
    presets: catalog.presets.map((item) => (item.id === params.entry.id ? updated : item)),
  });
  return updated;
}

export async function clonePreset(params: {
  source: PresetCatalogEntry | null;
  kind: PresetKind;
  name: string;
  description?: string | null;
  payload: PresetPayloadRecord;
  actor: AuthUser;
}) {
  return createPreset({
    kind: params.kind,
    name: params.name,
    description: params.description ?? params.source?.description ?? null,
    payload: params.payload,
    actor: params.actor,
  });
}

export async function markPresetDeleted(entryId: string): Promise<void> {
  const catalog = await readPresetCatalog();
  const nextPresets = catalog.presets.map((item) =>
    item.id === entryId ? { ...item, isDeleted: true, updatedAt: new Date().toISOString() } : item
  );
  const nextDefaults: Record<PresetKind, string | null> = {
    color: catalog.defaults.color === entryId ? null : catalog.defaults.color,
    layout: catalog.defaults.layout === entryId ? null : catalog.defaults.layout,
  };
  await writePresetCatalog({ ...catalog, defaults: nextDefaults, presets: nextPresets });
}

export async function setDefaultPreset(kind: PresetKind, presetId: string): Promise<void> {
  const catalog = await readPresetCatalog();
  await writePresetCatalog({
    ...catalog,
    defaults: {
      ...catalog.defaults,
      [kind]: presetId,
    },
  });
}

export async function getPresetEntryById(presetId: string): Promise<PresetCatalogEntry | null> {
  const catalog = await readPresetCatalog();
  return catalog.presets.find((item) => item.id === presetId && !item.isDeleted) ?? null;
}

export async function exportPresetPayload(entry: PresetCatalogEntry): Promise<unknown> {
  const raw = await readObjectText(entry.storageKey);
  if (!raw) {
    throw new Error("Preset asset is unavailable");
  }
  return JSON.parse(raw);
}
