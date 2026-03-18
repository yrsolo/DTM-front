import React from "react";
import { TaskV1 } from "@dtm/schema/snapshot";

import { fetchPersonNamesByOwnerIds } from "./api";

export function useResolvedOwnerNames(tasks: TaskV1[], enabled: boolean) {
  const [resolvedOwnerNames, setResolvedOwnerNames] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!enabled) {
      setResolvedOwnerNames({});
      return;
    }

    const ownerIds = [...new Set(tasks.map((task) => task.ownerId?.trim() ?? "").filter(Boolean))];
    if (!ownerIds.length) {
      setResolvedOwnerNames({});
      return;
    }

    let active = true;
    void (async () => {
      const next = await fetchPersonNamesByOwnerIds(ownerIds);
      if (!active) return;
      setResolvedOwnerNames(next);
    })();

    return () => {
      active = false;
    };
  }, [enabled, tasks]);

  return resolvedOwnerNames;
}
