import { createHash, randomBytes } from "node:crypto";

import { getAuthRuntimeConfig } from "../config";
import {
  createDeveloperToken,
  deleteDeveloperToken,
  getDeveloperTokenByHash,
  getDeveloperTokenById,
  listDeveloperTokenUsage,
  listDeveloperTokens,
  revokeDeveloperToken,
  touchDeveloperTokenUsage,
  updateDeveloperToken,
} from "../db/developerTokensRepo";
import { writeAuditLog } from "../db/auditRepo";
import { listUsersByStatus, getUserById } from "../db/usersRepo";
import { appendSetCookie, badRequest, forbidden, json, notFound } from "../http";
import { buildMePayload, resolveSession } from "../middleware/auth";
import { clearSessionCookie, issueSessionCookie } from "../session/cookieSession";
import type {
  DeveloperTokenRecord,
  DeveloperTokenStatus,
  NormalizedRequest,
  SessionClaims,
  SessionUser,
  UserStatus,
} from "../types";

type DeveloperTokenUsagePayload = {
  id: string;
  usedAt: string;
  ip: string | null;
  city: string | null;
  clientSummary: string | null;
};

type DeveloperTokenCardPayload = {
  id: string;
  label: string;
  status: DeveloperTokenStatus;
  expiresAt: string;
  createdAt: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  useCount: number;
  usageEvents: DeveloperTokenUsagePayload[];
};

type DevPersonaPayload = {
  id: string;
  kind: "guest" | "real_user" | "synthetic_blocked";
  label: string;
  role: "admin" | "viewer" | null;
  status: UserStatus | "guest";
  email: string | null;
  personName: string | null;
  canViewAllTasks: boolean;
  canUseDesignerGrouping: boolean;
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

function makeDeveloperTokenSecret(): string {
  return randomBytes(18).toString("base64url");
}

function parseExpiresAt(rawValue: unknown): Date | null {
  if (typeof rawValue === "string" && rawValue.trim()) {
    const parsed = new Date(rawValue);
    if (Number.isFinite(parsed.getTime())) return parsed;
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

function isLocalHostname(hostname: string): boolean {
  const value = hostname.trim().toLowerCase();
  return value === "localhost" || value === "127.0.0.1" || value === "::1" || value.endsWith(".local");
}

function readRequestOriginHost(req: NormalizedRequest): string | null {
  const candidates = [req.origin, req.headers.referer];
  for (const value of candidates) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (isLocalHostname(url.hostname)) return url.hostname.toLowerCase();
    } catch {
      // ignore malformed candidate
    }
  }
  return null;
}

function ensureLocalDevRequest(req: NormalizedRequest) {
  const cfg = getAuthRuntimeConfig();
  if (cfg.contour !== "test" || !cfg.localDevAuthEnabled) {
    return forbidden("Local developer auth is disabled");
  }
  const localHost = readRequestOriginHost(req);
  if (!localHost) {
    return forbidden("Local developer auth is available only from localhost");
  }
  return null;
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

function effectiveTokenStatus(token: Pick<DeveloperTokenRecord, "status" | "expiresAt">): DeveloperTokenStatus {
  if (token.status === "revoked") return "revoked";
  const expiresAtMs = Date.parse(token.expiresAt);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return "expired";
  return "active";
}

async function ensureStoredStatus(token: DeveloperTokenRecord): Promise<DeveloperTokenRecord> {
  const nextStatus = effectiveTokenStatus(token);
  if (nextStatus !== token.status) {
    await updateDeveloperToken({
      id: token.id,
      label: token.label,
      expiresAt: new Date(token.expiresAt),
      status: nextStatus,
    });
    const refreshed = await getDeveloperTokenById(token.id);
    return refreshed ?? { ...token, status: nextStatus };
  }
  return token;
}

async function toDeveloperTokenCard(token: DeveloperTokenRecord): Promise<DeveloperTokenCardPayload> {
  const normalized = await ensureStoredStatus(token);
  const usageEvents = await listDeveloperTokenUsage(normalized.id, 20);
  return {
    id: normalized.id,
    label: normalized.label,
    status: normalized.status,
    expiresAt: normalized.expiresAt,
    createdAt: normalized.createdAt,
    createdBy: normalized.createdBy,
    lastUsedAt: normalized.lastUsedAt,
    useCount: normalized.useCount,
    usageEvents,
  };
}

function buildRealUserDevClaims(user: NonNullable<Awaited<ReturnType<typeof getUserById>>>): SessionClaims {
  const cfg = getAuthRuntimeConfig();
  const now = Math.floor(Date.now() / 1000);
  return {
    kind: "dev_local",
    personaKind: "real_user",
    userId: user.id,
    sv: user.sessionVersion,
    iat: now,
    exp: now + cfg.sessionTtlSeconds,
  };
}

function buildSyntheticBlockedClaims(): SessionClaims {
  const cfg = getAuthRuntimeConfig();
  const now = Math.floor(Date.now() / 1000);
  return {
    kind: "dev_local",
    personaKind: "synthetic_blocked",
    label: "Local blocked persona",
    iat: now,
    exp: now + cfg.sessionTtlSeconds,
  };
}

async function validateDeveloperAuthToken(req: NormalizedRequest, rawToken: string): Promise<{
  ok: true;
  source: "bootstrap" | "developer_token";
  tokenRecord: DeveloperTokenRecord | null;
} | {
  ok: false;
  response: ReturnType<typeof forbidden> | ReturnType<typeof notFound> | ReturnType<typeof json>;
}> {
  const cfg = getAuthRuntimeConfig();
  if (cfg.localDevBootstrapToken && rawToken === cfg.localDevBootstrapToken) {
    return { ok: true, source: "bootstrap", tokenRecord: null };
  }

  const token = await getDeveloperTokenByHash(hashToken(rawToken));
  if (!token) {
    return { ok: false, response: notFound("Developer token not found") };
  }
  const normalized = await ensureStoredStatus(token);
  if (normalized.status !== "active") {
    return { ok: false, response: json(409, { error: "Developer token is not active", status: normalized.status }) };
  }
  return { ok: true, source: "developer_token", tokenRecord: normalized };
}

async function buildPersonaCatalog(): Promise<DevPersonaPayload[]> {
  const [approvedUsers, pendingUsers] = await Promise.all([
    listUsersByStatus("approved"),
    listUsersByStatus("pending"),
  ]);
  const realUsers = [...approvedUsers, ...pendingUsers]
    .sort((left, right) => {
      const leftName = (left.displayName || left.email || left.id).toLowerCase();
      const rightName = (right.displayName || right.email || right.id).toLowerCase();
      return leftName.localeCompare(rightName, "ru");
    })
    .map((user) => ({
      id: `user:${user.id}`,
      kind: "real_user" as const,
      label: user.displayName || user.email || user.id,
      role: user.role,
      status: user.status,
      email: user.email,
      personName: user.personName,
      canViewAllTasks: user.role === "admin" || user.canViewAllTasks,
      canUseDesignerGrouping: user.role === "admin" || user.canViewAllTasks,
    }));

  return [
    {
      id: "guest",
      kind: "guest",
      label: "Guest",
      role: null,
      status: "guest",
      email: null,
      personName: null,
      canViewAllTasks: false,
      canUseDesignerGrouping: false,
    },
    {
      id: "blocked",
      kind: "synthetic_blocked",
      label: "Blocked (local)",
      role: "viewer",
      status: "blocked",
      email: null,
      personName: null,
      canViewAllTasks: false,
      canUseDesignerGrouping: false,
    },
    ...realUsers,
  ];
}

export async function listDeveloperTokensHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const tokens = await listDeveloperTokens();
  const cards = await Promise.all(tokens.map(toDeveloperTokenCard));
  return json(200, { tokens: cards });
}

export async function createDeveloperTokenHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = parseJsonBody(req);
  if (!body) return badRequest("Request body must be a JSON object");

  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return badRequest("label is required");
  const expiresAt = computeExpiresAt(body);
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    return badRequest("A future expiresAt or expiryHours is required");
  }

  const rawToken = makeDeveloperTokenSecret();
  const created = await createDeveloperToken({
    label,
    tokenHash: hashToken(rawToken),
    expiresAt,
    createdBy: auth.user.displayName || auth.user.email || auth.user.id,
  });
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.developer_token_create",
    payloadJson: JSON.stringify({ developerTokenId: created.id, expiresAt: created.expiresAt }),
  });
  return json(200, {
    token: {
      ...(await toDeveloperTokenCard(created)),
      rawToken,
    },
  });
}

export async function updateDeveloperTokenHandler(req: NormalizedRequest, developerTokenId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = parseJsonBody(req);
  if (!body) return badRequest("Request body must be a JSON object");

  const existing = await getDeveloperTokenById(developerTokenId);
  if (!existing) return notFound("Developer token not found");
  const label = typeof body.label === "string" && body.label.trim() ? body.label.trim() : existing.label;
  const expiresAt = computeExpiresAt(body) ?? new Date(existing.expiresAt);
  if (expiresAt.getTime() <= Date.now() && existing.status !== "revoked") {
    return badRequest("expiresAt must be in the future");
  }
  const nextStatus =
    existing.status === "revoked"
      ? "revoked"
      : expiresAt.getTime() <= Date.now()
        ? "expired"
        : "active";
  await updateDeveloperToken({
    id: existing.id,
    label,
    expiresAt,
    status: nextStatus,
  });
  const updated = await getDeveloperTokenById(existing.id);
  if (!updated) return notFound("Developer token not found after update");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.developer_token_update",
    payloadJson: JSON.stringify({ developerTokenId: existing.id, expiresAt: updated.expiresAt, status: updated.status }),
  });
  return json(200, { token: await toDeveloperTokenCard(updated) });
}

export async function revokeDeveloperTokenHandler(req: NormalizedRequest, developerTokenId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getDeveloperTokenById(developerTokenId);
  if (!existing) return notFound("Developer token not found");
  await revokeDeveloperToken(developerTokenId);
  const revoked = await getDeveloperTokenById(developerTokenId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.developer_token_revoke",
    payloadJson: JSON.stringify({ developerTokenId }),
  });
  return json(200, { token: revoked ? await toDeveloperTokenCard(revoked) : null });
}

export async function deleteDeveloperTokenHandler(req: NormalizedRequest, developerTokenId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getDeveloperTokenById(developerTokenId);
  if (!existing) return notFound("Developer token not found");
  await revokeDeveloperToken(developerTokenId);
  await deleteDeveloperToken(developerTokenId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.developer_token_delete",
    payloadJson: JSON.stringify({ developerTokenId }),
  });
  return json(200, { ok: true, deleted: true, id: developerTokenId });
}

export async function developerTokenUsageHandler(req: NormalizedRequest, developerTokenId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const existing = await getDeveloperTokenById(developerTokenId);
  if (!existing) return notFound("Developer token not found");
  return json(200, { token: await toDeveloperTokenCard(existing) });
}

export async function devSessionCatalogHandler(req: NormalizedRequest) {
  const localOnlyError = ensureLocalDevRequest(req);
  if (localOnlyError) return localOnlyError;
  const body = parseJsonBody(req);
  if (!body) return badRequest("Request body must be a JSON object");
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  if (!rawToken) return badRequest("token is required");
  const validation = await validateDeveloperAuthToken(req, rawToken);
  if (!validation.ok) return validation.response;
  return json(200, {
    ok: true,
    tokenSource: validation.source,
    personas: await buildPersonaCatalog(),
  });
}

export async function devSessionImpersonateHandler(req: NormalizedRequest) {
  const localOnlyError = ensureLocalDevRequest(req);
  if (localOnlyError) return localOnlyError;
  const body = parseJsonBody(req);
  if (!body) return badRequest("Request body must be a JSON object");
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  const personaId = typeof body.personaId === "string" ? body.personaId.trim() : "";
  if (!rawToken) return badRequest("token is required");
  if (!personaId) return badRequest("personaId is required");

  const validation = await validateDeveloperAuthToken(req, rawToken);
  if (!validation.ok) return validation.response;

  if (personaId === "guest") {
    return appendSetCookie(json(200, { ok: true, me: buildMePayload(null) }), clearSessionCookie());
  }

  let claims: SessionClaims | null = null;
  let user: SessionUser | null = null;
  if (personaId === "blocked") {
    claims = buildSyntheticBlockedClaims();
    user = {
      id: "dev-local:blocked",
      yandexUid: "dev-local:blocked",
      email: null,
      displayName: "Local blocked persona",
      avatarUrl: null,
      personId: null,
      personName: null,
      telegramId: null,
      telegramUsername: null,
      canViewAllTasks: false,
      status: "blocked",
      role: "viewer",
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      sessionKind: "dev_local",
      expiresAt: new Date((claims as Extract<SessionClaims, { kind: "dev_local" }>).exp * 1000).toISOString(),
      temporaryAccessLabel: null,
      sourceAccessLinkId: null,
      canUseDesignerGrouping: false,
    };
  } else if (personaId.startsWith("user:")) {
    const realUser = await getUserById(personaId.slice("user:".length));
    if (!realUser) return notFound("User persona not found");
    claims = buildRealUserDevClaims(realUser);
    user = {
      ...realUser,
      sessionKind: "dev_local",
      expiresAt: new Date((claims as Extract<SessionClaims, { kind: "dev_local" }>).exp * 1000).toISOString(),
      temporaryAccessLabel: null,
      sourceAccessLinkId: null,
      canUseDesignerGrouping: realUser.role === "admin" || realUser.canViewAllTasks,
    };
  } else {
    return badRequest("Unknown personaId");
  }

  await writeAuditLog({
    actorUserId: null,
    targetUserId: user?.id ?? null,
    action: "auth.dev_local_impersonate",
    payloadJson: JSON.stringify({
      personaId,
      source: validation.source,
      developerTokenId: validation.tokenRecord?.id ?? null,
    }),
  });

  if (validation.tokenRecord) {
    await touchDeveloperTokenUsage({
      developerTokenId: validation.tokenRecord.id,
      ip: extractIp(req.headers),
      city: extractCity(req.headers),
      clientSummary: extractClientSummary(req.headers),
    });
  }

  return appendSetCookie(
    json(200, { ok: true, me: buildMePayload(user) }),
    issueSessionCookie(claims)
  );
}

export async function devSessionLogoutHandler(req: NormalizedRequest) {
  const localOnlyError = ensureLocalDevRequest(req);
  if (localOnlyError) return localOnlyError;
  return appendSetCookie(json(200, { ok: true }), clearSessionCookie());
}
