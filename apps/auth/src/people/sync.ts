import { createHash, timingSafeEqual } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";
import type { LinkedPersonRecord } from "../types";

type RawPersonRecord = Record<string, unknown>;

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function readString(record: RawPersonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readEmail(record: RawPersonRecord): string | null {
  const direct = readString(record, [
    "yandexEmail",
    "contactEmail",
    "email",
    "primaryEmail",
    "workEmail",
    "mail",
  ]);
  if (direct) return normalizeEmail(direct);

  const emails = record.emails;
  if (Array.isArray(emails)) {
    for (const value of emails) {
      const normalized = normalizeEmail(value);
      if (normalized) return normalized;
    }
  }
  return null;
}

function readTelegramId(record: RawPersonRecord): string | null {
  const direct = record.telegramId ?? record.telegram_id ?? record.tgId ?? record.tg_id;
  if (typeof direct === "number" && Number.isFinite(direct)) return String(Math.trunc(direct));
  if (typeof direct === "string" && direct.trim()) return direct.trim();

  const nested = record.telegram;
  if (nested && typeof nested === "object") {
    const nestedRecord = nested as RawPersonRecord;
    const nestedValue = nestedRecord.id ?? nestedRecord.userId;
    if (typeof nestedValue === "number" && Number.isFinite(nestedValue)) return String(Math.trunc(nestedValue));
    if (typeof nestedValue === "string" && nestedValue.trim()) return nestedValue.trim();
  }
  return null;
}

function readTelegramUsername(record: RawPersonRecord): string | null {
  const direct = readString(record, ["telegramUsername", "telegram_username", "tgUsername", "telegramHandle"]);
  if (direct) return direct.replace(/^@/, "");

  const nested = record.telegram;
  if (nested && typeof nested === "object") {
    const nestedRecord = nested as RawPersonRecord;
    const username = readString(nestedRecord, ["username", "handle"]);
    return username ? username.replace(/^@/, "") : null;
  }
  return null;
}

function mapLinkedPerson(record: RawPersonRecord): LinkedPersonRecord | null {
  const personId = readString(record, ["id", "personId", "person_id"]);
  if (!personId) return null;
  return {
    personId,
    personName: readString(record, ["name", "displayName", "fullName"]),
    email: readEmail(record),
    telegramId: readTelegramId(record),
    telegramUsername: readTelegramUsername(record),
  };
}

function parsePeoplePayload(payload: unknown): LinkedPersonRecord[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as RawPersonRecord;
  const candidates = [root.people, root.items, root.entities, root.data];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    return candidate
      .map((item) => (item && typeof item === "object" ? mapLinkedPerson(item as RawPersonRecord) : null))
      .filter((item): item is LinkedPersonRecord => Boolean(item));
  }
  if (Array.isArray(payload)) {
    return payload
      .map((item) => (item && typeof item === "object" ? mapLinkedPerson(item as RawPersonRecord) : null))
      .filter((item): item is LinkedPersonRecord => Boolean(item));
  }
  return [];
}

export async function fetchPeopleDirectory(): Promise<LinkedPersonRecord[]> {
  const cfg = getAuthRuntimeConfig();
  const path = cfg.peopleSyncPath.startsWith("/") ? cfg.peopleSyncPath : `/${cfg.peopleSyncPath}`;
  const url = `${cfg.apiUpstreamOrigin}${path}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "x-dtm-contour": cfg.contour,
      "x-dtm-proxy-secret": cfg.browserAuthProxySecret,
    },
  });
  if (!response.ok) {
    throw new Error(`People sync failed (HTTP ${response.status})`);
  }
  return parsePeoplePayload(await response.json());
}

export async function resolveLinkedPersonByEmail(email: string | null): Promise<LinkedPersonRecord | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const people = await fetchPeopleDirectory();
  return findLinkedPersonByEmail(people, normalized);
}

export function computePeopleDirectoryHash(people: LinkedPersonRecord[]): string {
  const digest = createHash("sha256");
  digest.update(JSON.stringify(people));
  return digest.digest("hex");
}

export function hashesEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function findLinkedPersonByEmail(
  people: LinkedPersonRecord[],
  email: string | null
): LinkedPersonRecord | null {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  return people.find((person) => person.email === normalized) ?? null;
}

export function findLinkedPersonByTelegramId(
  people: LinkedPersonRecord[],
  telegramId: string | null
): LinkedPersonRecord | null {
  const normalized = typeof telegramId === "string" ? telegramId.trim() : "";
  if (!normalized) return null;
  return people.find((person) => person.telegramId === normalized) ?? null;
}
