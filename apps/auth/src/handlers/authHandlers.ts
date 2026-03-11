import { buildAuthorizeUrl, exchangeCode, fetchProfile } from "../yandex/oauth";
import { appendSetCookie, badRequest, json, redirect } from "../http";
import { isEmailAllowed } from "../db/allowlistRepo";
import { ensureOpenAccessRequest } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import {
  createUserFromProfile,
  getUserByYandexUid,
  syncUserProfile,
  getUserById,
  setUserStatus,
  upsertRole,
} from "../db/usersRepo";
import { buildMePayload, getAccessMode, isBootstrapAdmin, resolveSession } from "../middleware/auth";
import { issueSessionCookie, clearSessionCookie } from "../session/cookieSession";
import { clearOAuthStateCookie, createOAuthStateCookie, readOAuthState } from "../session/oauthState";
import type { NormalizedRequest } from "../types";

const ALLOWED_RETURN_TO_HOSTS = new Set([
  "dtm.solofarm.ru",
  "localhost",
  "127.0.0.1",
  "::1",
]);

function normalizeReturnTo(raw: string | null | undefined): string {
  const candidate = raw?.trim() || "/";
  if (candidate.startsWith("/")) {
    return candidate;
  }

  try {
    const url = new URL(candidate);
    const host = url.hostname.toLowerCase();
    if (ALLOWED_RETURN_TO_HOSTS.has(host) || host.endsWith(".local")) {
      return url.toString();
    }
  } catch {
    // fall through
  }

  return "/";
}

export async function login(req: NormalizedRequest) {
  const returnTo = normalizeReturnTo(req.query.get("return_to"));
  const { cookie, state } = createOAuthStateCookie(returnTo);
  return redirect(buildAuthorizeUrl(state), {
    "set-cookie": cookie,
  });
}

export async function callback(req: NormalizedRequest) {
  const code = req.query.get("code");
  const state = req.query.get("state");
  if (!code || !state) {
    return badRequest("Missing OAuth callback params");
  }

  const oauthState = readOAuthState(req.headers.cookie);
  if (!oauthState || oauthState.state !== state) {
    return badRequest("Invalid OAuth state");
  }

  const token = await exchangeCode(code);
  const profile = await fetchProfile(token.access_token);
  const existing = await getUserByYandexUid(profile.id);

  let user = existing;
  if (!user) {
    const autoApproved = await isEmailAllowed(profile.default_email);
    const shouldBootstrapAdmin = isBootstrapAdmin(profile.id);
    user = await createUserFromProfile(
      profile,
      autoApproved || shouldBootstrapAdmin ? "approved" : "pending",
      shouldBootstrapAdmin ? "admin" : "viewer"
    );
    if (user.status === "pending") {
      await ensureOpenAccessRequest(user.id, user.email);
    }
  } else {
    await syncUserProfile(user.id, profile);
    user = await getUserById(user.id);
    if (!user) {
      return badRequest("User disappeared after profile sync");
    }
    if (isBootstrapAdmin(profile.id) && user.role !== "admin") {
      await upsertRole(user.id, "admin");
      await setUserStatus(user.id, "approved");
      user = await getUserById(user.id);
    } else if (user.status !== "approved" && (await isEmailAllowed(profile.default_email))) {
      await setUserStatus(user.id, "approved");
      user = await getUserById(user.id);
    }
    if (user?.status === "pending") {
      await ensureOpenAccessRequest(user.id, user.email);
    }
  }

  if (!user) {
    return badRequest("Unable to create or load user");
  }

  await writeAuditLog({
    actorUserId: user.id,
    targetUserId: user.id,
    action: "auth.login",
    payloadJson: JSON.stringify({
      status: user.status,
      role: user.role,
      accessMode: getAccessMode(user),
    }),
  });

  const now = Math.floor(Date.now() / 1000);
  const sessionCookie = issueSessionCookie({
    userId: user.id,
    yandexUid: user.yandexUid,
    role: user.role,
    status: user.status,
    sv: user.sessionVersion,
    iat: now,
    exp: now + 60 * 60 * 12,
  });

  return redirect(oauthState.returnTo, {
    "set-cookie": `${sessionCookie}, ${clearOAuthStateCookie()}`,
  });
}

export async function me(req: NormalizedRequest) {
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  const headers = clearCookie ? { "set-cookie": clearSessionCookie() } : undefined;
  return json(200, buildMePayload(user), headers);
}

export async function logout() {
  return json(
    200,
    { ok: true },
    {
      "set-cookie": clearSessionCookie(),
    }
  );
}
