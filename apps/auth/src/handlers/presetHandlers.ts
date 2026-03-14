import { badRequest, forbidden, json, notFound, serviceUnavailable } from "../http";
import { resolveSession } from "../middleware/auth";
import type { NormalizedRequest } from "../types";
import {
  canCreatePreset,
  canManagePreset,
  createPreset,
  clonePreset,
  exportPresetPayload,
  getPresetEntryById,
  listPresetEntries,
  markPresetDeleted,
  PresetStorageUnavailableError,
  setDefaultPreset,
  updatePreset,
  type PresetKind,
} from "../presets/catalog";

function parseKind(value: string | null): PresetKind | null {
  if (value === "color" || value === "layout") return value;
  return null;
}

function parseJsonBody(req: NormalizedRequest): Record<string, unknown> | null {
  if (!req.bodyText) return {};
  try {
    const parsed = JSON.parse(req.bodyText);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function mapPresetWriteError(error: unknown) {
  if (error instanceof PresetStorageUnavailableError) {
    return serviceUnavailable(error.message);
  }
  throw error;
}

async function requireApprovedUser(req: NormalizedRequest) {
  const resolved = await resolveSession(req.headers.cookie);
  if (!resolved.user || !canCreatePreset(resolved.user)) {
    return { error: forbidden("Approved account required"), user: null };
  }
  return { error: null, user: resolved.user };
}

async function requireAdmin(req: NormalizedRequest) {
  const resolved = await resolveSession(req.headers.cookie);
  if (!resolved.user || resolved.user.role !== "admin") {
    return { error: forbidden("Admin access required"), user: null };
  }
  return { error: null, user: resolved.user };
}

export async function listPresetsHandler(req: NormalizedRequest) {
  const kind = parseKind(req.query.get("kind"));
  if (!kind) return badRequest("kind is required");
  const resolved = await resolveSession(req.headers.cookie);
  const listed = await listPresetEntries(kind, resolved.user);
  return json(200, listed);
}

export async function getPresetHandler(req: NormalizedRequest, presetId: string) {
  const entry = await getPresetEntryById(presetId);
  if (!entry) return notFound("Preset not found");
  return json(200, { preset: entry });
}

export async function createPresetHandler(req: NormalizedRequest) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;

  const body = parseJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");
  const kind = parseKind(typeof body.kind === "string" ? body.kind : null);
  if (!kind) return badRequest("kind is required");
  if (typeof body.name !== "string" || !body.name.trim()) return badRequest("name is required");
  if (!body.payload || typeof body.payload !== "object") return badRequest("payload is required");

  try {
    const preset = await createPreset({
      kind,
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      payload: body.payload as Record<string, unknown>,
      actor: auth.user,
    });
    return json(200, { ok: true, preset });
  } catch (error) {
    return mapPresetWriteError(error);
  }
}

export async function updatePresetHandler(req: NormalizedRequest, presetId: string) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;
  const entry = await getPresetEntryById(presetId);
  if (!entry) return notFound("Preset not found");
  if (!canManagePreset(auth.user, entry)) {
    return forbidden("You can edit only your own presets");
  }

  const body = parseJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");
  if (typeof body.name !== "string" || !body.name.trim()) return badRequest("name is required");
  if (!body.payload || typeof body.payload !== "object") return badRequest("payload is required");

  try {
    const preset = await updatePreset({
      entry,
      name: body.name,
      description: typeof body.description === "string" ? body.description : null,
      payload: body.payload as Record<string, unknown>,
    });
    return json(200, { ok: true, preset });
  } catch (error) {
    return mapPresetWriteError(error);
  }
}

export async function deletePresetHandler(req: NormalizedRequest, presetId: string) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;
  const entry = await getPresetEntryById(presetId);
  if (!entry) return notFound("Preset not found");
  if (!canManagePreset(auth.user, entry)) {
    return forbidden("You can delete only your own presets");
  }

  try {
    await markPresetDeleted(entry.id);
    return json(200, { ok: true });
  } catch (error) {
    return mapPresetWriteError(error);
  }
}

export async function clonePresetHandler(req: NormalizedRequest, presetId: string) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;
  const source = await getPresetEntryById(presetId);
  if (!source) return notFound("Preset not found");

  const body = parseJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");
  const kind = parseKind(typeof body.kind === "string" ? body.kind : source.kind);
  if (!kind) return badRequest("kind is required");
  if (typeof body.name !== "string" || !body.name.trim()) return badRequest("name is required");
  if (!body.payload || typeof body.payload !== "object") return badRequest("payload is required");

  try {
    const preset = await clonePreset({
      source,
      kind,
      name: body.name,
      description: typeof body.description === "string" ? body.description : source.description,
      payload: body.payload as Record<string, unknown>,
      actor: auth.user,
    });
    return json(200, { ok: true, preset });
  } catch (error) {
    return mapPresetWriteError(error);
  }
}

export async function setDefaultPresetHandler(req: NormalizedRequest, presetId: string) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = parseJsonBody(req);
  const entry = await getPresetEntryById(presetId);
  const kind = parseKind(typeof body?.kind === "string" ? body.kind : entry?.kind ?? null);
  if (!kind) return badRequest("kind is required");

  try {
    await setDefaultPreset(kind, presetId);
    return json(200, { ok: true });
  } catch (error) {
    return mapPresetWriteError(error);
  }
}

export async function importPresetHandler(req: NormalizedRequest) {
  return createPresetHandler(req);
}

export async function exportPresetHandler(req: NormalizedRequest, presetId: string) {
  const entry = await getPresetEntryById(presetId);
  if (!entry) return notFound("Preset not found");
  const payload = await exportPresetPayload(entry);
  return json(200, {
    preset: entry,
    payload,
  });
}
