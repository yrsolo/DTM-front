import { getAuthRuntimeConfig } from "../config";
import { getAccessLinkById } from "../db/accessLinksRepo";
import { isEmailAllowed } from "../db/allowlistRepo";
import { incrementSessionVersion, setUserStatus, getUserById, upsertRole } from "../db/usersRepo";
import { clearSessionCookie, readSessionClaims } from "../session/cookieSession";
import type { AccessMode, AuthUser, SessionClaims, SessionKind, SessionUser, TempLinkSessionClaims, UserSessionClaims } from "../types";

function decorateUserSession(user: AuthUser, provider: Exclude<SessionKind, "temp_link">): SessionUser {
  return {
    ...user,
    sessionKind: provider,
    expiresAt: null,
    temporaryAccessLabel: null,
    sourceAccessLinkId: null,
    canUseDesignerGrouping: user.role === "admin" || user.canViewAllTasks,
  };
}

function materializeTempLinkSession(claims: TempLinkSessionClaims, link: Awaited<ReturnType<typeof getAccessLinkById>>): SessionUser | null {
  if (!link) return null;
  const expiresAtMs = Date.parse(link.expiresAt);
  if (link.status !== "active" || !Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return null;
  }
  return {
    id: `access-link:${link.id}`,
    yandexUid: `access-link:${link.id}`,
    email: null,
    displayName: link.label,
    avatarUrl: null,
    personId: null,
    personName: null,
    telegramId: null,
    telegramUsername: null,
    canViewAllTasks: true,
    status: "approved",
    role: "viewer",
    sessionVersion: 1,
    createdAt: link.createdAt,
    lastLoginAt: link.lastUsedAt,
    sessionKind: claims.kind,
    expiresAt: link.expiresAt,
    temporaryAccessLabel: link.label,
    sourceAccessLinkId: link.id,
    canUseDesignerGrouping: link.showDesignerGrouping,
  };
}

export async function resolveSession(
  cookieHeader: string | undefined
): Promise<{ claims: SessionClaims | null; user: SessionUser | null; clearCookie: boolean }> {
  const claims = readSessionClaims(cookieHeader);
  if (!claims) {
    return { claims: null, user: null, clearCookie: false };
  }

  if (claims.kind === "temp_link") {
    const link = await getAccessLinkById(claims.linkId);
    const user = materializeTempLinkSession(claims, link);
    if (!user) {
      return { claims: null, user: null, clearCookie: true };
    }
    return { claims, user, clearCookie: false };
  }

  const userClaims = claims as UserSessionClaims;
  const user = await getUserById(userClaims.userId);
  if (!user) {
    return { claims: null, user: null, clearCookie: true };
  }

  if (user.sessionVersion !== userClaims.sv || user.status === "blocked") {
    return { claims: null, user: null, clearCookie: true };
  }

  return {
    claims,
    user: decorateUserSession(user, userClaims.provider === "telegram" ? "telegram" : "yandex"),
    clearCookie: false,
  };
}

export function getAccessMode(user: Pick<SessionUser, "status"> | null): AccessMode {
  return user?.status === "approved" ? "full" : "masked";
}

export async function autoApproveByAllowlist(user: AuthUser): Promise<AuthUser> {
  if (user.status === "approved") return user;
  const allowed = await isEmailAllowed(user.email);
  if (!allowed) return user;
  await setUserStatus(user.id, "approved");
  return (await getUserById(user.id)) ?? user;
}

export async function blockAndRevoke(userId: string): Promise<void> {
  await setUserStatus(userId, "blocked");
  await incrementSessionVersion(userId);
}

export async function approveUser(userId: string): Promise<void> {
  await setUserStatus(userId, "approved");
}

export async function ensureAdminRole(userId: string): Promise<void> {
  await upsertRole(userId, "admin");
}

export function buildMePayload(user: SessionUser | null) {
  return {
    authenticated: Boolean(user),
    accessMode: getAccessMode(user),
    sessionKind: user?.sessionKind ?? null,
    expiresAt: user?.expiresAt ?? null,
    temporaryAccessLabel: user?.temporaryAccessLabel ?? null,
    user: user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          personId: user.personId,
          personName: user.personName,
          telegramId: user.telegramId,
          telegramUsername: user.telegramUsername,
          canViewAllTasks: user.canViewAllTasks,
          canUseDesignerGrouping: user.canUseDesignerGrouping,
          role: user.role,
          status: user.status,
        }
      : null,
  };
}

export function isBootstrapAdmin(yandexUid: string): boolean {
  const cfg = getAuthRuntimeConfig();
  return Boolean(cfg.adminBootstrapUid && cfg.adminBootstrapUid === yandexUid);
}

export function clearCookieHeaders(): Record<string, string> {
  return { "set-cookie": clearSessionCookie() };
}
