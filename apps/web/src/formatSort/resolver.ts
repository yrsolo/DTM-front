import type {
  FormatSortTaskSnapshot,
  NormalizedTaskFormatId,
  RawTaskFormatEntry,
  TaskFormatConfig,
  TaskFormatManualOverride,
  TaskFormatSourceSnapshot,
} from "./types";

export const UNSORTED_FORMAT_ID = "unsorted" as const;

export function normalizeFormatText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildManualOverrideMap(overrides: TaskFormatManualOverride[]): Map<string, NormalizedTaskFormatId> {
  return new Map(
    overrides
      .map((entry) => [normalizeFormatText(entry.rawValue), entry.formatId] as const)
      .filter(([rawValue]) => rawValue.length > 0)
  );
}

function matchesContainsRule(normalizedRawValue: string, tokens: string[], excludes: string[]): boolean {
  if (!tokens.length) return false;
  if (excludes.some((token) => normalizedRawValue.includes(token))) return false;
  return tokens.every((token) => normalizedRawValue.includes(token));
}

export function resolveNormalizedTaskFormat(
  rawFormat: string | null | undefined,
  config: TaskFormatConfig
): NormalizedTaskFormatId | typeof UNSORTED_FORMAT_ID {
  const normalizedRawValue = normalizeFormatText(rawFormat);
  if (!normalizedRawValue) return UNSORTED_FORMAT_ID;

  const manualOverride = buildManualOverrideMap(config.manualOverrides).get(normalizedRawValue);
  if (manualOverride) return manualOverride;

  const sortedRules = [...config.aliasRules].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  for (const rule of sortedRules) {
    const aliases = (rule.aliases ?? []).map((entry) => normalizeFormatText(entry)).filter(Boolean);
    if (aliases.includes(normalizedRawValue)) {
      return rule.formatId;
    }
    const excludes = (rule.excludes ?? []).map((entry) => normalizeFormatText(entry)).filter(Boolean);
    for (const tokens of rule.containsAll ?? []) {
      const normalizedTokens = tokens.map((entry) => normalizeFormatText(entry)).filter(Boolean);
      if (matchesContainsRule(normalizedRawValue, normalizedTokens, excludes)) {
        return rule.formatId;
      }
    }
  }

  return UNSORTED_FORMAT_ID;
}

export function buildRawTaskFormatInventory(
  snapshot: TaskFormatSourceSnapshot,
  config: TaskFormatConfig
): RawTaskFormatEntry[] {
  const grouped = new Map<string, RawTaskFormatEntry>();
  const manualMap = buildManualOverrideMap(config.manualOverrides);

  for (const task of snapshot.tasks) {
    const rawValue = (task.format_ ?? task.type ?? "").trim();
    if (!rawValue) continue;
    const normalizedRawValue = normalizeFormatText(rawValue);
    const existing = grouped.get(normalizedRawValue);
    if (existing) {
      existing.count += 1;
      if (existing.sampleTasks.length < 3) {
        existing.sampleTasks.push({
          id: task.id,
          title: task.title,
        });
      }
      continue;
    }

    const autoMatch = resolveNormalizedTaskFormat(rawValue, {
      ...config,
      manualOverrides: [],
    });
    grouped.set(normalizedRawValue, {
      rawValue,
      normalizedRawValue,
      count: 1,
      sampleTasks: [
        {
          id: task.id,
          title: task.title,
        },
      ],
      autoMatchFormatId: autoMatch === UNSORTED_FORMAT_ID ? null : autoMatch,
      manualFormatId: manualMap.get(normalizedRawValue) ?? null,
    });
  }

  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.rawValue.localeCompare(right.rawValue, "ru");
  });
}

export function snapshotTasksFromUnknown(input: unknown): FormatSortTaskSnapshot[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: String(item.id ?? ""),
      title: String(item.title ?? "Untitled"),
      format_: typeof item.format_ === "string" ? item.format_ : null,
      type: typeof item.type === "string" ? item.type : null,
      ownerId: typeof item.ownerId === "string" ? item.ownerId : null,
      ownerName: typeof item.ownerName === "string" ? item.ownerName : null,
      brand: typeof item.brand === "string" ? item.brand : null,
      groupId: typeof item.groupId === "string" ? item.groupId : null,
      status: typeof item.status === "string" ? item.status : "",
      start: typeof item.start === "string" ? item.start : null,
      end: typeof item.end === "string" ? item.end : null,
      nextDue: typeof item.nextDue === "string" ? item.nextDue : null,
    }))
    .filter((item) => item.id.length > 0);
}
