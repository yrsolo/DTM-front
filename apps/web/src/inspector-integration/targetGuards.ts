import type { InspectorTarget } from "@dtm/workbench-inspector";

export function isInspectorTarget(value: unknown): value is InspectorTarget {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.label === "string";
}
