import { SnapshotV1 } from "@dtm/schema/snapshot";
import React from "react";
import { fetchApiSnapshot, fetchLocalSnapshot } from "./api";
import { normalizeToSnapshotV1 } from "./normalize";

const LOCAL_SNAPSHOT_STORAGE_KEY = "dtm.web.localSnapshotRaw.v1";

let cached: SnapshotV1 | null = null;

export function useSnapshot() {
  const [snapshot, setSnapshot] = React.useState<SnapshotV1 | null>(cached);
  const [isLoading, setIsLoading] = React.useState<boolean>(!cached);
  const [error, setError] = React.useState<unknown>(null);

  const loadLocal = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fromStorage = localStorage.getItem(LOCAL_SNAPSHOT_STORAGE_KEY);
      const raw = fromStorage ? JSON.parse(fromStorage) : await fetchLocalSnapshot();
      const normalized = normalizeToSnapshotV1(raw);
      cached = normalized;
      setSnapshot(normalized);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncFromApi = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const raw = await fetchApiSnapshot();
      localStorage.setItem(LOCAL_SNAPSHOT_STORAGE_KEY, JSON.stringify(raw));
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
    if (!cached) void loadLocal();
  }, [loadLocal]);

  return { snapshot, isLoading, error, reloadLocal: loadLocal, syncFromApi };
}
