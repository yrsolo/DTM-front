import { badRequest, forbidden, json } from "../http";
import { listAllowlistEntries, addAllowlistEmail, removeAllowlistEmail } from "../db/allowlistRepo";
import { closeAccessRequestsForUser, listAccessRequests } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import { ensureAdminRole, resolveSession } from "../middleware/auth";
import { incrementSessionVersion, listUsersByStatus, setUserStatus, upsertRole } from "../db/usersRepo";
import type { NormalizedRequest } from "../types";

async function requireAdmin(req: NormalizedRequest) {
  const resolved = await resolveSession(req.headers.cookie);
  if (!resolved.user || resolved.user.role !== "admin") {
    return { error: forbidden("Admin access required"), user: null };
  }
  return { error: null, user: resolved.user };
}

function parseJsonBody(req: NormalizedRequest): any {
  if (!req.bodyText) return {};
  try {
    return JSON.parse(req.bodyText);
  } catch {
    return null;
  }
}

function getAvatarUrl(yandexUid: string): string {
  return `https://avatars.yandex.net/get-yapic/${encodeURIComponent(yandexUid)}/islands-200`;
}

export async function listAdminData(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const [pendingUsers, approvedUsers, allowlist, accessRequests] = await Promise.all([
    listUsersByStatus("pending"),
    listUsersByStatus("approved"),
    listAllowlistEntries(),
    listAccessRequests(),
  ]);

  const latestRequestByUserId = new Map<string, string>();
  for (const request of accessRequests) {
    if (!latestRequestByUserId.has(request.userId)) {
      latestRequestByUserId.set(request.userId, request.requestedAt);
    }
  }

  const mapUserCard = (user: Awaited<ReturnType<typeof listUsersByStatus>>[number]) => ({
    id: user.id,
    yandexUid: user.yandexUid,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    role: user.role,
    requestedAt: latestRequestByUserId.get(user.id) ?? user.createdAt,
    avatarUrl: getAvatarUrl(user.yandexUid),
  });

  return json(200, {
    pendingUsers: pendingUsers.map(mapUserCard),
    approvedUsers: approvedUsers.map(mapUserCard),
    allowlist,
  });
}

export async function approveUserHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  await setUserStatus(userId, "approved");
  await closeAccessRequestsForUser(userId, "approved");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.approve_user",
  });

  return json(200, { ok: true });
}

export async function rejectUserHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  await setUserStatus(userId, "pending");
  await closeAccessRequestsForUser(userId, "rejected");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.reject_user",
  });

  return json(200, { ok: true });
}

export async function revokeApprovedUserHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  if (auth.user.id === userId) {
    return forbidden("You cannot revoke your own approved access");
  }

  await upsertRole(userId, "viewer");
  await setUserStatus(userId, "pending");
  await incrementSessionVersion(userId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.revoke_user",
  });

  return json(200, { ok: true });
}

export async function makeAdminHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  await ensureAdminRole(userId);
  await setUserStatus(userId, "approved");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.make_admin",
  });

  return json(200, { ok: true });
}

export async function removeAdminHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  if (auth.user.id === userId) {
    return forbidden("You cannot remove your own admin role");
  }

  await upsertRole(userId, "viewer");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.remove_admin",
  });

  return json(200, { ok: true });
}

export async function addAllowlistEmailHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = parseJsonBody(req);
  if (!body || typeof body.email !== "string") {
    return badRequest("email is required");
  }

  await addAllowlistEmail(body.email, auth.user.id, typeof body.comment === "string" ? body.comment : null);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.allowlist_add",
    payloadJson: JSON.stringify({ email: body.email }),
  });

  return json(200, { ok: true });
}

export async function removeAllowlistEmailHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const email = req.query.get("email");
  if (!email) return badRequest("email is required");
  await removeAllowlistEmail(email);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.allowlist_remove",
    payloadJson: JSON.stringify({ email }),
  });
  return json(200, { ok: true });
}
