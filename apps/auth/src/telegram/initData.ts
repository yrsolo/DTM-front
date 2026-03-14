import { createHmac } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";

export type TelegramInitDataUser = {
  id: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

function decodeValue(value: string): string {
  return decodeURIComponent(value.replace(/\+/g, "%20"));
}

function parseInitData(initData: string): { authDate: number | null; hash: string | null; fields: Map<string, string> } {
  const fields = new Map<string, string>();
  let authDate: number | null = null;
  let hash: string | null = null;

  for (const part of initData.split("&")) {
    if (!part) continue;
    const [rawKey, rawValue = ""] = part.split("=");
    const key = decodeValue(rawKey);
    const value = decodeValue(rawValue);
    if (key === "hash") {
      hash = value;
      continue;
    }
    if (key === "auth_date") {
      const parsed = Number(value);
      authDate = Number.isFinite(parsed) ? parsed : null;
    }
    fields.set(key, value);
  }

  return { authDate, hash, fields };
}

function buildDataCheckString(fields: Map<string, string>): string {
  return [...fields.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function parseTelegramUser(rawUserJson: string | undefined): TelegramInitDataUser | null {
  if (!rawUserJson) return null;
  try {
    const parsed = JSON.parse(rawUserJson) as Record<string, unknown>;
    const rawId = parsed.id;
    const id = typeof rawId === "number" && Number.isFinite(rawId)
      ? String(Math.trunc(rawId))
      : typeof rawId === "string" && rawId.trim()
        ? rawId.trim()
        : null;
    if (!id) return null;
    return {
      id,
      username: typeof parsed.username === "string" && parsed.username.trim() ? parsed.username.trim() : null,
      firstName: typeof parsed.first_name === "string" && parsed.first_name.trim() ? parsed.first_name.trim() : null,
      lastName: typeof parsed.last_name === "string" && parsed.last_name.trim() ? parsed.last_name.trim() : null,
    };
  } catch {
    return null;
  }
}

export function verifyTelegramInitData(initData: string): TelegramInitDataUser | null {
  const cfg = getAuthRuntimeConfig();
  if (!cfg.telegramBotToken) {
    throw new Error("Telegram Mini App auth is not configured");
  }
  const parsed = parseInitData(initData);
  if (!parsed.hash || !parsed.authDate) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - parsed.authDate) > 60 * 15) {
    return null;
  }

  const dataCheckString = buildDataCheckString(parsed.fields);
  const secretKey = createHmac("sha256", "WebAppData").update(cfg.telegramBotToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  if (computedHash !== parsed.hash) return null;

  return parseTelegramUser(parsed.fields.get("user"));
}
