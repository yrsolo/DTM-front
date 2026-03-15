import { SnapshotV1 } from "@dtm/schema/snapshot";

/**
 * Normalizes various API response formats (v1, v2, etc.) to the internal SnapshotV1 structure.
 */
export function normalizeToSnapshotV1(payload: any): SnapshotV1 {
  if (!payload) throw new Error("Empty payload");

  // Format Detection
  const isV2 =
    payload.meta?.artifact === "dtm_frontend_api_v2" || payload.entities;
  const isV1 = payload.meta?.version === "v1" && Array.isArray(payload.tasks);

  if (isV2) {
    return normalizeV2(payload);
  }

  if (isV1) {
    return payload as SnapshotV1;
  }

  // Best effort fallback
  if (Array.isArray(payload.tasks)) {
    return {
      meta: { version: "v1", generatedAt: new Date().toISOString() },
      people: Array.isArray(payload.people) ? payload.people : [],
      tasks: payload.tasks,
      enums: payload.enums || {},
    };
  }

  throw new Error(
    "Unsupported API response format: unable to find tasks array"
  );
}

function toOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeAttachment(input: any) {
  if (!input || typeof input !== "object") return null;
  const id = toOptionalString(input.id);
  const name = toOptionalString(input.name);
  const mime = toOptionalString(input.mime);
  const kind = toOptionalString(input.kind);
  const status = toOptionalString(input.status);
  const sizeBytes = typeof input.sizeBytes === "number" && Number.isFinite(input.sizeBytes)
    ? input.sizeBytes
    : typeof input.size_bytes === "number" && Number.isFinite(input.size_bytes)
      ? input.size_bytes
      : null;

  if (!id || !name || !mime || !kind || !status || sizeBytes === null) {
    return null;
  }

  const capabilities = Array.isArray(input.capabilities)
    ? input.capabilities.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const preview = toOptionalString(input.meta?.preview ?? input.preview);
  const view = toOptionalString(input.links?.view);
  const download = toOptionalString(input.links?.download);

  return {
    id,
    name,
    mime,
    kind,
    sizeBytes,
    status,
    uploadedAt: toOptionalString(input.uploadedAt ?? input.uploaded_at),
    capabilities,
    meta: preview !== null ? { preview } : undefined,
    links: view !== null || download !== null ? { view, download } : undefined,
  };
}

/** Maps the v2 API response to the internal SnapshotV1 shape. */
function normalizeV2(payload: any): SnapshotV1 {
  return {
    meta: {
      version: "v1",
      generatedAt:
        payload.meta?.generatedAt || new Date().toISOString(),
      source: payload.meta?.source?.sheetName,
      hash: payload.meta?.hash,
    },
    people: (payload.entities?.people || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      position: p.position ?? null,
    })),
    groups: (payload.entities?.groups || []).map((g: any) => ({
      id: g.id,
      name: g.name,
    })),
    tasks: (payload.tasks || []).map((t: any) => ({
      id: t.id,
      title: t.title || "Untitled",
      ownerId:
        t.ownerId ??
        t.owner_id ??
        t.designerId ??
        (typeof t.owner === "string" ? t.owner : null) ??
        null,
      ownerName:
        t.ownerName ??
        t.designer ??
        (typeof t.owner === "string" ? t.owner : null) ??
        null,
      brand: t.brand ?? null,
      customer:
        t.customer ??
        t.customerName ??
        t.manager ??
        t.managerName ??
        null,
      format_: t.format_ ?? null,
      type: t.type ?? null,
      status: t.status,
      start: t.date?.start || t.start,
      end: t.date?.end || t.end,
      nextDue: t.date?.nextDue,
      tags: t.tags || [],
      groupId: t.groupId,
      links: t.links
        ? { sheetRowUrl: t.links.sheetRowUrl, self: t.links.self }
        : undefined,
      history: t.history ?? null,
      milestones: Array.isArray(t.milestones)
        ? t.milestones.map((m: any) => ({
            type: m.type,
            planned: m.planned,
            actual: m.actual ?? null,
            status: m.status,
          }))
        : [],
      attachments: Array.isArray(t.attachments)
        ? t.attachments
            .map((attachment: any) => normalizeAttachment(attachment))
            .filter(Boolean)
        : undefined,
      hash: t.hash ?? null,
      revision: t.revision ?? null,
    })),
    enums: {
      status: payload.entities?.enums?.status,
      statusGroups: payload.entities?.enums?.statusGroups,
      milestoneType: payload.entities?.enums?.milestoneType,
      milestoneStatus: payload.entities?.enums?.milestoneStatus,
    },
  };
}
