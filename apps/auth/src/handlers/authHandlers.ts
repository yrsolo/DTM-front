import { getAuthRuntimeConfig } from "../config";
import { buildAuthorizeUrl, exchangeCode, fetchProfile } from "../yandex/oauth";
import { appendSetCookie, badRequest, html, json, redirect } from "../http";
import { isEmailAllowed } from "../db/allowlistRepo";
import { ensureOpenAccessRequest } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import {
  createUserFromProfile,
  createUserFromTelegram,
  getUserByEmail,
  getUserById,
  getUserByTelegramId,
  getUserByYandexUid,
  linkUserToPerson,
  setUserStatus,
  syncUserProfile,
  upsertRole,
} from "../db/usersRepo";
import { buildMePayload, getAccessMode, isBootstrapAdmin, resolveSession } from "../middleware/auth";
import { fetchPeopleDirectory, findLinkedPersonByTelegramId, resolveLinkedPersonByEmail } from "../people/sync";
import { clearSessionCookie, issueSessionCookie } from "../session/cookieSession";
import { clearOAuthStateCookie, createOAuthStateCookie, readOAuthState } from "../session/oauthState";
import { verifyTelegramInitData } from "../telegram/initData";
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

async function syncUserLinkageByEmail(userId: string, email: string | null) {
  try {
    const linkedPerson = await resolveLinkedPersonByEmail(email);
    await linkUserToPerson(userId, linkedPerson);
  } catch {
    // Linkage sync is best-effort on login. Admin refresh provides explicit recovery.
  }
}

function buildSessionCookieForUser(
  user: NonNullable<Awaited<ReturnType<typeof getUserById>>>,
  provider: "yandex" | "telegram"
) {
  const cfg = getAuthRuntimeConfig();
  const now = Math.floor(Date.now() / 1000);
  return issueSessionCookie({
    kind: "user",
    provider,
    userId: user.id,
    yandexUid: user.yandexUid,
    role: user.role,
    status: user.status,
    sv: user.sessionVersion,
    iat: now,
    exp: now + cfg.sessionTtlSeconds,
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

  await syncUserLinkageByEmail(user.id, user.email);
  user = await getUserById(user.id);
  if (!user) {
    return badRequest("User disappeared after linkage sync");
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

  const sessionCookie = buildSessionCookieForUser(user, "yandex");

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

function telegramSessionError(
  status: number,
  reason:
    | "invalid_init_data"
    | "telegram_person_not_found"
    | "telegram_person_missing_email"
    | "telegram_user_not_found_by_email"
    | "telegram_user_not_linked",
  telegramUserId: string | null
) {
  return json(status, {
    ok: false,
    reason,
    telegramUserId,
  });
}

export async function telegramSession(req: NormalizedRequest) {
  let initData = "";
  try {
    const parsed = req.bodyText ? JSON.parse(req.bodyText) as Record<string, unknown> : {};
    initData = typeof parsed.initData === "string" ? parsed.initData : "";
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!initData) {
    return badRequest("initData is required");
  }

  let telegramUser;
  try {
    telegramUser = verifyTelegramInitData(initData);
  } catch {
    return telegramSessionError(400, "invalid_init_data", null);
  }
  if (!telegramUser) {
    return telegramSessionError(400, "invalid_init_data", null);
  }

  let user = await getUserByTelegramId(telegramUser.id);
  if (!user) {
    const directory = await fetchPeopleDirectory();
    const linkedPerson = findLinkedPersonByTelegramId(directory, telegramUser.id);
    if (!linkedPerson) {
      return telegramSessionError(404, "telegram_person_not_found", telegramUser.id);
    }
    if (linkedPerson.email) {
      user = await getUserByEmail(linkedPerson.email);
    }
    if (user) {
      await linkUserToPerson(user.id, linkedPerson);
      user = await getUserById(user.id);
    } else {
      user = await createUserFromTelegram(telegramUser, linkedPerson);
    }
  } else if (!user.personId) {
    const directory = await fetchPeopleDirectory();
    const linkedPerson = findLinkedPersonByTelegramId(directory, telegramUser.id);
    if (linkedPerson) {
      await linkUserToPerson(user.id, linkedPerson);
      user = await getUserById(user.id);
    }
  }

  if (!user) {
    return telegramSessionError(404, "telegram_user_not_linked", telegramUser.id);
  }

  if (user.status !== "approved") {
    await setUserStatus(user.id, "approved");
    user = await getUserById(user.id);
  }

  const sessionCookie = buildSessionCookieForUser(user, "telegram");
  user = await getUserById(user.id);
  const result = json(200, {
    ok: true,
    accessMode: getAccessMode(user),
    user: buildMePayload(user).user,
  });
  return appendSetCookie(result, sessionCookie);
}
