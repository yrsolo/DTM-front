import { SnapshotV1 } from "@dtm/schema/snapshot";
import React from "react";
import { fetchSnapshot } from "./api";
import { normalizeToSnapshotV1 } from "./normalize";

let cached: SnapshotV1 | null = null;

export function useSnapshot() {
  const [snapshot, setSnapshot] = React.useState<SnapshotV1 | null>(cached);
  const [isLoading, setIsLoading] = React.useState<boolean>(!cached);
  const [error, setError] = React.useState<unknown>(null);

  const load = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const raw = await fetchSnapshot();
      const normalized = normalizeToSnapshotV1(raw);
      cached = normalized;
      setSnapshot(normalized);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!cached) void load();
  }, [load]);

  return { snapshot, isLoading, error, reload: load };
}
