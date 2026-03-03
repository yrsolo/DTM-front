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
      ownerId: t.ownerId,
      status: t.status,
      start: t.date?.start || t.start,
      end: t.date?.end || t.end,
      nextDue: t.date?.nextDue,
      tags: t.tags || [],
      groupId: t.groupId,
      links: t.links
        ? { sheetRowUrl: t.links.sheetRowUrl, self: t.links.self }
        : undefined,
      milestones: Array.isArray(t.milestones)
        ? t.milestones.map((m: any) => ({
            type: m.type,
            planned: m.planned,
            actual: m.actual ?? null,
            status: m.status,
          }))
        : [],
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
