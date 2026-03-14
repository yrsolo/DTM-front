import { getAuthRuntimeConfig } from "../config";
import { buildAuthorizeUrl, exchangeCode, fetchProfile } from "../yandex/oauth";
import { appendSetCookie, badRequest, html, json, redirect } from "../http";
import { isEmailAllowed } from "../db/allowlistRepo";
import { ensureOpenAccessRequest } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import {
  createUserFromProfile,
  getUserById,
  getUserByYandexUid,
  setUserStatus,
  syncUserProfile,
  upsertRole,
} from "../db/usersRepo";
import { buildMePayload, getAccessMode, isBootstrapAdmin, resolveSession } from "../middleware/auth";
import { clearSessionCookie, issueSessionCookie } from "../session/cookieSession";
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
  const popup = req.query.get("popup") === "1";
  const { cookie, state } = createOAuthStateCookie(returnTo, popup);
  return appendSetCookie(redirect(buildAuthorizeUrl(state)), cookie);
}

function buildPopupClosePage(returnTo: string): string {
  const safeReturnTo = JSON.stringify(returnTo);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>DTM Auth</title>
  <style>
    body{margin:0;font-family:Manrope,Segoe UI,sans-serif;background:#0b1020;color:#eef4ff;display:grid;place-items:center;min-height:100vh}
    .card{padding:20px 24px;border:1px solid rgba(140,162,224,.24);border-radius:16px;background:linear-gradient(180deg,rgba(12,18,35,.96),rgba(20,17,42,.94));box-shadow:0 18px 40px rgba(0,0,0,.35)}
  </style>
</head>
<body>
  <div class="card">Authorization complete. You can close this window.</div>
  <script>
    const returnTo = ${safeReturnTo};
    const targetOrigin = (() => {
      try { return new URL(returnTo, window.location.origin).origin; } catch { return window.location.origin; }
    })();
    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({ type: "dtm-auth-complete", returnTo }, targetOrigin);
        window.close();
      }
    } catch {}
    window.location.replace(returnTo);
  </script>
</body>
</html>`;
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

  const cfg = getAuthRuntimeConfig();
  const now = Math.floor(Date.now() / 1000);
  const sessionCookie = issueSessionCookie({
    userId: user.id,
    yandexUid: user.yandexUid,
    role: user.role,
    status: user.status,
    sv: user.sessionVersion,
    iat: now,
    exp: now + cfg.sessionTtlSeconds,
  });

  const response = oauthState.popup
    ? html(200, buildPopupClosePage(oauthState.returnTo))
    : redirect(oauthState.returnTo);

  return appendSetCookie(
    appendSetCookie(response, sessionCookie),
    clearOAuthStateCookie()
  );
}

export async function me(req: NormalizedRequest) {
  const { user, clearCookie } = await resolveSession(req.headers.cookie);
  const result = json(200, buildMePayload(user));
  return clearCookie ? appendSetCookie(result, clearSessionCookie()) : result;
}

export async function logout() {
  return appendSetCookie(json(200, { ok: true }), clearSessionCookie());
}
