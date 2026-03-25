import { createHash, createHmac, randomUUID } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";
import {
  createAccessLink,
  deleteAccessLink,
  getAccessLinkById,
  listAccessLinkUsage,
  listAccessLinks,
  revokeAccessLink,
  touchAccessLinkUsage,
  updateAccessLink,
} from "../db/accessLinksRepo";
import { writeAuditLog } from "../db/auditRepo";
import { appendSetCookie, badRequest, forbidden, json, notFound } from "../http";
import { resolveSession } from "../middleware/auth";
import { issueSessionCookie } from "../session/cookieSession";
import type { AccessLinkRecord, AccessLinkStatus, NormalizedRequest, SessionClaims } from "../types";

type AccessLinkCardPayload = {
  id: string;
  label: string;
  status: AccessLinkStatus;
  browserUrl: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  useCount: number;
  showDesignerGrouping: boolean;
  usageEvents: Array<{
    id: string;
    usedAt: string;
    ip: string | null;
    city: string | null;
    clientSummary: string | null;
  }>;
};

function parseJsonBody(req: NormalizedRequest): Record<string, unknown> | null {
  if (!req.bodyText) return {};
  try {
    const parsed = JSON.parse(req.bodyText) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

async function requireAdmin(req: NormalizedRequest) {
  const resolved = await resolveSession(req.headers.cookie);
  if (!resolved.user || resolved.user.role !== "admin") {
    return { error: forbidden("Admin access required"), user: null as null };
  }
  return { error: null, user: resolved.user };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function signLinkId(linkId: string): string {
  const cfg = getAuthRuntimeConfig();
  return createHmac("sha256", cfg.sessionSigningSecret).update(`access-link:${linkId}`).digest("base64url");
}

function makeAccessLinkToken(linkId: string): string {
  return `${linkId}.${signLinkId(linkId)}`;
}

function makeShortAccessLinkCode(linkId: string): string {
  const cfg = getAuthRuntimeConfig();
  return createHmac("sha256", cfg.sessionSigningSecret)
    .update(`access-link-short:${linkId}`)
    .digest("base64url")
    .slice(0, 12);
}

function readAccessLinkToken(token: string): { linkId: string; signature: string } | null {
  const [linkId, signature] = token.split(".");
  if (!linkId || !signature) return null;
  return { linkId, signature };
}

function getTimelinePath(): string {
  const cfg = getAuthRuntimeConfig();
  return cfg.contour === "test" ? "/test/" : "/";
}

function buildBrowserUrl(token: string): string {
  const cfg = getAuthRuntimeConfig();
  const base = cfg.baseUrl.replace(/\/+$/, "");
  const url = new URL(`${base}${getTimelinePath()}`);
  url.searchParams.set("k", token);
  return url.toString();
}

function parseExpiresAt(rawValue: unknown): Date | null {
  if (typeof rawValue === "string" && rawValue.trim()) {
    const parsed = new Date(rawValue);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }
  return null;
}

function parseExpiryHours(rawValue: unknown): number | null {
  if (typeof rawValue === "number" && Number.isFinite(rawValue) && rawValue > 0) {
    return rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim()) {
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function computeExpiresAt(body: Record<string, unknown>): Date | null {
  const explicit = parseExpiresAt(body.expiresAt);
  if (explicit) return explicit;
  const hours = parseExpiryHours(body.expiresInHours ?? body.expiryHours);
  if (hours != null) {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }
  return null;
}

function parseShowDesignerGrouping(rawValue: unknown, fallback = false): boolean {
  if (typeof rawValue === "boolean") return rawValue;
  if (typeof rawValue === "string") {
    const normalized = rawValue.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") return true;
    if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") return false;
  }
  return fallback;
}

function effectiveLinkStatus(link: Pick<AccessLinkRecord, "status" | "expiresAt">): AccessLinkStatus {
  if (link.status === "revoked") return "revoked";
  const expiresAtMs = Date.parse(link.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return "expired";
  return "active";
}

async function ensureStoredStatus(link: AccessLinkRecord): Promise<AccessLinkRecord> {
  const nextStatus = effectiveLinkStatus(link);
  if (nextStatus !== link.status) {
    await updateAccessLink({
      id: link.id,
      label: link.label,
      expiresAt: new Date(link.expiresAt),
      status: nextStatus,
      showDesignerGrouping: link.showDesignerGrouping,
    });
    const refreshed = await getAccessLinkById(link.id);
    return refreshed ?? { ...link, status: nextStatus };
  }
  return link;
}

function extractIp(headers: Record<string, string>): string | null {
  const forwarded = headers["x-forwarded-for"]?.split(",")[0]?.trim();
  const real = headers["x-real-ip"]?.trim();
  return forwarded || real || null;
}

function extractCity(headers: Record<string, string>): string | null {
  return (
    headers["x-geo-city"]?.trim() ||
    headers["x-region-city"]?.trim() ||
    headers["x-appengine-city"]?.trim() ||
    null
  );
}

function extractClientSummary(headers: Record<string, string>): string | null {
  const userAgent = headers["user-agent"]?.trim();
  return userAgent ? userAgent.slice(0, 240) : null;
}

async function toAccessLinkCard(link: AccessLinkRecord): Promise<AccessLinkCardPayload> {
  const normalized = await ensureStoredStatus(link);
  const usageEvents = await listAccessLinkUsage(normalized.id, 20);
  return {
    id: normalized.id,
    label: normalized.label,
    status: normalized.status,
    browserUrl: null,
    expiresAt: normalized.expiresAt,
    createdAt: normalized.createdAt,
    createdBy: normalized.createdBy,
    lastUsedAt: normalized.lastUsedAt,
    useCount: normalized.useCount,
    showDesignerGrouping: normalized.showDesignerGrouping,
    usageEvents,
  };
}

function buildTempLinkClaims(link: AccessLinkRecord): SessionClaims {
  const cfg = getAuthRuntimeConfig();
  const now = Math.floor(Date.now() / 1000);
  const linkExpiry = Math.floor(new Date(link.expiresAt).getTime() / 1000);
  return {
    kind: "temp_link",
    linkId: link.id,
    iat: now,
    exp: Math.min(now + cfg.sessionTtlSeconds, linkExpiry),
  };
}

export async function listAccessLinksHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  return json(200, { links: await buildAccessLinkCards() });
}

export async function createAccessLinkHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = parseJsonBody(req);
  if (!body) {
    return badRequest("Request body must be a JSON object");
  }

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) {
    return badRequest("label is required");
  }

  const expiresAt = computeExpiresAt(body);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return badRequest("A future expiresAt or expiryHours is required");
  }
  const showDesignerGrouping = parseShowDesignerGrouping(body.showDesignerGrouping, false);

  const linkId = randomUUID();
  const rawToken = makeShortAccessLinkCode(linkId);
  const created = await createAccessLink({
    id: linkId,
    label,
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdBy: auth.user.displayName || auth.user.email || auth.user.id,
    showDesignerGrouping,
  });
  const card = await toAccessLinkCard(created);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.access_link_create",
    payloadJson: JSON.stringify({ accessLinkId: created.id, expiresAt: created.expiresAt }),
  });
  return json(200, {
    link: {
      ...card,
      browserUrl: buildBrowserUrl(rawToken),
    },
  });
}

export async function updateAccessLinkHandler(req: NormalizedRequest, linkId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = parseJsonBody(req);
  if (!body) {
    return badRequest("Request body must be a JSON object");
  }

  const existing = await getAccessLinkById(linkId);
  if (!existing) {
    return notFound("Access link not found");
  }

  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : existing.label;
  const expiresAt = computeExpiresAt(body) ?? new Date(existing.expiresAt);
  const showDesignerGrouping = parseShowDesignerGrouping(body.showDesignerGrouping, existing.showDesignerGrouping);
  if (expiresAt.getTime() <= Date.now() && existing.status !== "revoked") {
    return badRequest("expiresAt must be in the future");
  }
  const nextStatus =
    existing.status === "revoked"
      ? "revoked"
      : expiresAt.getTime() <= Date.now()
        ? "expired"
        : "active";
  await updateAccessLink({
    id: existing.id,
    label,
    expiresAt,
    status: nextStatus,
    showDesignerGrouping,
  });
  const updated = await getAccessLinkById(existing.id);
  if (!updated) {
    return notFound("Access link not found after update");
  }
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.access_link_update",
    payloadJson: JSON.stringify({ accessLinkId: existing.id, expiresAt: updated.expiresAt, status: updated.status }),
  });
  return json(200, { link: await toAccessLinkCard(updated) });
}

export async function revokeAccessLinkHandler(req: NormalizedRequest, linkId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getAccessLinkById(linkId);
  if (!existing) {
    return notFound("Access link not found");
  }
  await revokeAccessLink(linkId);
  const revoked = await getAccessLinkById(linkId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.access_link_revoke",
    payloadJson: JSON.stringify({ accessLinkId: linkId }),
  });
  return json(200, { link: revoked ? await toAccessLinkCard(revoked) : null });
}

export async function activateAccessLinkHandler(req: NormalizedRequest, linkId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getAccessLinkById(linkId);
  if (!existing) {
    return notFound("Access link not found");
  }
  const expiresAt = new Date(existing.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
    return badRequest("Нельзя активировать ссылку с истекшим сроком. Сначала продлите дату окончания.");
  }
  await updateAccessLink({
    id: linkId,
    label: existing.label,
    expiresAt,
    status: "active",
    showDesignerGrouping: existing.showDesignerGrouping,
  });
  const activated = await getAccessLinkById(linkId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.access_link_activate",
    payloadJson: JSON.stringify({ accessLinkId: linkId }),
  });
  return json(200, { link: activated ? await toAccessLinkCard(activated) : null });
}

export async function deleteAccessLinkHandler(req: NormalizedRequest, linkId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getAccessLinkById(linkId);
  if (!existing) {
    return notFound("Access link not found");
  }
  await revokeAccessLink(linkId);
  await deleteAccessLink(linkId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.access_link_delete",
    payloadJson: JSON.stringify({ accessLinkId: linkId }),
  });
  return json(200, { ok: true, deleted: true, id: linkId });
}

export async function accessLinkUsageHandler(req: NormalizedRequest, linkId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getAccessLinkById(linkId);
  if (!existing) {
    return notFound("Access link not found");
  }
  return json(200, {
    link: await toAccessLinkCard(existing),
  });
}

export async function redeemAccessLinkHandler(req: NormalizedRequest) {
  const body = parseJsonBody(req);
  if (!body) {
    return badRequest("Request body must be a JSON object");
  }
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  if (!rawToken) {
    return badRequest("token is required");
  }
  let existing = null as AccessLinkRecord | null;
  const parsed = readAccessLinkToken(rawToken);
  if (parsed && parsed.signature === signLinkId(parsed.linkId)) {
    existing = await getAccessLinkById(parsed.linkId);
    if (!existing || existing.tokenHash !== hashToken(rawToken)) {
      existing = null;
    }
  }
  if (!existing && rawToken.length === 12) {
    const candidates = await listAccessLinks();
    existing =
      candidates.find((link) => makeShortAccessLinkCode(link.id) === rawToken) ??
      null;
    if (existing) {
      const legacyToken = makeAccessLinkToken(existing.id);
      const matchesShort = existing.tokenHash === hashToken(rawToken);
      const matchesLegacy = existing.tokenHash === hashToken(legacyToken);
      if (!matchesShort && !matchesLegacy) {
        existing = null;
      }
    }
  }
  if (!existing) {
    return notFound("Access link not found");
  }
  const link = await ensureStoredStatus(existing);
  if (link.status !== "active") {
    return json(409, { error: "Access link is not active", status: link.status });
  }

  await touchAccessLinkUsage({
    linkId: link.id,
    ip: extractIp(req.headers),
    city: extractCity(req.headers),
    clientSummary: extractClientSummary(req.headers),
  });
  await writeAuditLog({
    actorUserId: null,
    targetUserId: null,
    action: "auth.access_link_redeem",
    payloadJson: JSON.stringify({ accessLinkId: link.id }),
  });

  const refreshed = await getAccessLinkById(link.id);
  if (!refreshed) {
    return notFound("Access link disappeared after redemption");
  }

  return appendSetCookie(
    json(200, {
      ok: true,
      sessionKind: "temp_link",
      expiresAt: refreshed.expiresAt,
      temporaryAccessLabel: refreshed.label,
    }),
    issueSessionCookie(buildTempLinkClaims(refreshed))
  );
}

export async function buildAccessLinkCards(): Promise<AccessLinkCardPayload[]> {
  const links = await listAccessLinks();
  const cards = await Promise.all(links.map(toAccessLinkCard));
  return cards.map((card) => ({
    ...card,
    browserUrl: buildBrowserUrl(makeShortAccessLinkCode(card.id)),
  }));
}
