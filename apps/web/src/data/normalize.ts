import { SnapshotV1 } from "@dtm/schema/snapshot";

/**
 * In MVP we expect the payload to already be SnapshotV1.
 * Later this adapter can be expanded to map arbitrary API responses to SnapshotV1.
 */
export function normalizeToSnapshotV1(payload: any): SnapshotV1 {
  if (!payload || !payload.meta || payload.meta.version !== "v1") {
    throw new Error("Unsupported snapshot payload: missing meta.version=v1");
  }
  return payload as SnapshotV1;
}
