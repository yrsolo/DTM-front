import { badRequest, forbidden, json } from "../http";
import { listAllowlistEntries, addAllowlistEmail, removeAllowlistEmail } from "../db/allowlistRepo";
import { closeAccessRequestsForUser, listOpenAccessRequests } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import { blockAndRevoke, ensureAdminRole, resolveSession } from "../middleware/auth";
import { getUserById, listUsersByStatus, approveUser } from "../db/usersRepo";
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

export async function listAdminData(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const [pendingUsers, allowlist, openRequests] = await Promise.all([
    listUsersByStatus("pending"),
    listAllowlistEntries(),
    listOpenAccessRequests(),
  ]);

  return json(200, {
    pendingUsers,
    allowlist,
    openRequests,
  });
}

export async function approveUserHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  await approveUser(userId);
  await closeAccessRequestsForUser(userId, "approved");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.approve_user",
  });

  return json(200, { ok: true });
}

export async function blockUserHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  await blockAndRevoke(userId);
  await closeAccessRequestsForUser(userId, "closed");
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.block_user",
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
