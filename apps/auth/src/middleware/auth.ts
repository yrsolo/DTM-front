import { getAuthRuntimeConfig } from "../config";
import { isEmailAllowed } from "../db/allowlistRepo";
import { incrementSessionVersion, setUserStatus, getUserById, upsertRole } from "../db/usersRepo";
import { clearSessionCookie, readSessionClaims } from "../session/cookieSession";
import type { AccessMode, AuthUser, SessionClaims } from "../types";

export async function resolveSession(
  cookieHeader: string | undefined
): Promise<{ claims: SessionClaims | null; user: AuthUser | null; clearCookie: boolean }> {
  const claims = readSessionClaims(cookieHeader);
  if (!claims) {
    return { claims: null, user: null, clearCookie: false };
  }

  const user = await getUserById(claims.userId);
  if (!user) {
    return { claims: null, user: null, clearCookie: true };
  }

  if (user.sessionVersion !== claims.sv || user.status === "blocked") {
    return { claims: null, user: null, clearCookie: true };
  }

  return { claims, user, clearCookie: false };
}

export function getAccessMode(user: AuthUser | null): AccessMode {
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

export function buildMePayload(user: AuthUser | null) {
  return {
    authenticated: Boolean(user),
    accessMode: getAccessMode(user),
    user: user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
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
