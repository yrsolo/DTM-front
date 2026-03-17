import { badRequest, forbidden, json } from "../http";
import { buildAccessLinkCards } from "./accessLinksHandlers";
import { listAllowlistEntries, addAllowlistEmail, removeAllowlistEmail } from "../db/allowlistRepo";
import { closeAccessRequestsForUser, listAccessRequests } from "../db/accessRequestsRepo";
import { writeAuditLog } from "../db/auditRepo";
import { getAdminLayoutPrefs, saveAdminLayoutOrder, type AdminLayoutListKey } from "../db/adminLayoutPrefsRepo";
import { ensureAdminRole, resolveSession } from "../middleware/auth";
import { listPresetEntries } from "../presets/catalog";
import { incrementSessionVersion, linkUserToPerson, listUsersByStatus, setUserCanViewAllTasks, setUserStatus, upsertRole } from "../db/usersRepo";
import { computePeopleDirectoryHash, fetchPeopleDirectory, findLinkedPersonByEmail } from "../people/sync";
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

function applyPersonalOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const byId = new Map(items.map((item) => [item.id, item] as const));
  const ordered: T[] = [];
  const used = new Set<string>();

  for (const id of order) {
    const item = byId.get(id);
    if (!item || used.has(id)) continue;
    ordered.push(item);
    used.add(id);
  }

  for (const item of items) {
    if (used.has(item.id)) continue;
    ordered.push(item);
  }

  return ordered;
}

export async function listAdminData(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const [pendingUsers, approvedUsers, allowlist, accessRequests, colorPresets, layoutPresets, prefs, accessLinks] = await Promise.all([
    listUsersByStatus("pending"),
    listUsersByStatus("approved"),
    listAllowlistEntries(),
    listAccessRequests(),
    listPresetEntries("color", auth.user),
    listPresetEntries("layout", auth.user),
    getAdminLayoutPrefs(auth.user.id),
    buildAccessLinkCards(),
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
      personId: user.personId,
      personName: user.personName,
      telegramId: user.telegramId,
      telegramUsername: user.telegramUsername,
      canViewAllTasks: user.canViewAllTasks,
      status: user.status,
      role: user.role,
      requestedAt: latestRequestByUserId.get(user.id) ?? user.createdAt,
      avatarUrl: user.avatarUrl,
    });

  const orderedPendingUsers = applyPersonalOrder(pendingUsers.map(mapUserCard), prefs?.pendingUsers ?? []);
  const orderedApprovedUsers = applyPersonalOrder(approvedUsers.map(mapUserCard), prefs?.approvedUsers ?? []);
  const orderedColorPresets = applyPersonalOrder(colorPresets.presets, prefs?.colorPresets ?? []);
  const orderedLayoutPresets = applyPersonalOrder(layoutPresets.presets, prefs?.layoutPresets ?? []);

  return json(200, {
    pendingUsers: orderedPendingUsers,
    approvedUsers: orderedApprovedUsers,
    allowlist,
    accessLinks,
    presets: {
      color: orderedColorPresets,
      layout: orderedLayoutPresets,
      defaults: {
        color: colorPresets.defaults.color,
        layout: layoutPresets.defaults.layout,
      },
    },
  });
}

export async function saveAdminLayoutOrderHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = parseJsonBody(req);
  if (!body || typeof body !== "object") {
    return badRequest("Request body must be a JSON object");
  }

  const list = body.list;
  const ids = body.ids;
  const allowedLists = new Set<AdminLayoutListKey>(["pendingUsers", "approvedUsers", "colorPresets", "layoutPresets"]);
  if (typeof list !== "string" || !allowedLists.has(list as AdminLayoutListKey)) {
    return badRequest("Unknown layout order list");
  }
  if (!Array.isArray(ids) || ids.some((id) => typeof id !== "string" || !id)) {
    return badRequest("ids must be a non-empty string array");
  }

  const uniqueIds = [...new Set(ids)];
  await saveAdminLayoutOrder(auth.user.id, list as AdminLayoutListKey, uniqueIds);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.layout_order_update",
    payloadJson: JSON.stringify({ list, ids: uniqueIds }),
  });

  return json(200, { ok: true, list, ids: uniqueIds });
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

export async function setUserAllTasksHandler(req: NormalizedRequest, userId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = parseJsonBody(req);
  if (!body || typeof body.enabled !== "boolean") {
    return badRequest("enabled boolean is required");
  }

  await setUserCanViewAllTasks(userId, body.enabled);
  await incrementSessionVersion(userId);
  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: userId,
    action: "admin.user_all_tasks_update",
    payloadJson: JSON.stringify({ enabled: body.enabled }),
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

export async function refreshDesignersDirectoryHandler(req: NormalizedRequest) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const users = await listUsersByStatus();
  const directory = await fetchPeopleDirectory();
  const directoryHash = computePeopleDirectoryHash(directory);
  let linked = 0;
  let cleared = 0;

  for (const user of users) {
    const nextLink = findLinkedPersonByEmail(directory, user.email);
    await linkUserToPerson(user.id, nextLink);
    if (nextLink) linked += 1;
    else cleared += 1;
  }

  await writeAuditLog({
    actorUserId: auth.user.id,
    targetUserId: null,
    action: "admin.refresh_designers_directory",
    payloadJson: JSON.stringify({
      usersProcessed: users.length,
      linked,
      cleared,
      directoryHash,
    }),
  });

  return json(200, {
    ok: true,
    usersProcessed: users.length,
    linked,
    cleared,
    directoryHash,
  });
}
