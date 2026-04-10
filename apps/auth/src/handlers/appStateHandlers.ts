import { badRequest, forbidden, json, serviceUnavailable } from "../http";
import { resolveSession } from "../middleware/auth";
import type { NormalizedRequest } from "../types";
import {
  parseSharedAppStateId,
  readSharedAppState,
  SharedAppStateStorageUnavailableError,
  writeSharedAppState,
} from "../appState/storage";

function parseJsonBody(req: NormalizedRequest): Record<string, unknown> | null {
  if (!req.bodyText) return {};
  try {
    const parsed = JSON.parse(req.bodyText);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function mapStorageError(error: unknown) {
  if (error instanceof SharedAppStateStorageUnavailableError) {
    return serviceUnavailable(error.message);
  }
  throw error;
}

async function requireApprovedUser(req: NormalizedRequest) {
  const resolved = await resolveSession(req.headers.cookie);
  if (!resolved.user || resolved.user.status !== "approved") {
    return { error: forbidden("Approved account required"), user: null };
  }
  return { error: null, user: resolved.user };
}

export async function getSharedAppStateHandler(req: NormalizedRequest, stateIdRaw: string) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;
  const stateId = parseSharedAppStateId(stateIdRaw);
  if (!stateId) return badRequest("Unknown shared app-state id");

  try {
    const state = await readSharedAppState(stateId);
    return json(200, {
      id: stateId,
      exists: Boolean(state),
      updatedAt: state?.updatedAt ?? null,
      value: state?.value ?? null,
    });
  } catch (error) {
    return mapStorageError(error);
  }
}

export async function putSharedAppStateHandler(req: NormalizedRequest, stateIdRaw: string) {
  const auth = await requireApprovedUser(req);
  if (auth.error) return auth.error;
  const stateId = parseSharedAppStateId(stateIdRaw);
  if (!stateId) return badRequest("Unknown shared app-state id");

  const body = parseJsonBody(req);
  if (!body) return badRequest("Invalid JSON body");
  if (!Object.prototype.hasOwnProperty.call(body, "value")) {
    return badRequest("value is required");
  }

  try {
    const result = await writeSharedAppState(stateId, body.value);
    return json(200, {
      ok: true,
      id: stateId,
      changed: result.changed,
      updatedAt: result.updatedAt,
      value: body.value ?? null,
    });
  } catch (error) {
    return mapStorageError(error);
  }
}
