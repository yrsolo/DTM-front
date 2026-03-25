import taskFormatConfigYaml from "../content/formatSort/taskFormatConfig.yaml?raw";
import type {
  NormalizedTaskFormatId,
  TaskFormatAliasRule,
  TaskFormatCatalogEntry,
  TaskFormatConfig,
  TaskFormatManualOverride,
} from "./types";

type TaskFormatYamlEntry = {
  title: string;
  description?: string | null;
  sort_order: number;
};

type TaskFormatYamlAliasGroup = {
  priority?: number;
  exact?: string[];
  contains_all?: string[][];
  excludes?: string[];
};

type TaskFormatYamlDocument = {
  formats: Partial<Record<NormalizedTaskFormatId, TaskFormatYamlEntry>>;
  aliases?: Partial<Record<NormalizedTaskFormatId, TaskFormatYamlAliasGroup>>;
  manual_overrides?: Partial<Record<NormalizedTaskFormatId, string[]>>;
};

function countIndent(value: string): number {
  let indent = 0;
  while (indent < value.length && value[indent] === " ") {
    indent += 1;
  }
  return indent;
}

function parseScalar(rawValue: string): string {
  const value = rawValue.trim();
  if (!value) return "";
  if (value.startsWith("\"")) {
    return JSON.parse(value) as string;
  }
  return value;
}

function parseNumber(rawValue: string): number {
  const value = Number(rawValue.trim());
  return Number.isFinite(value) ? value : 0;
}

function parseInlineArray(rawValue: string): string[] {
  return JSON.parse(rawValue.trim()) as string[];
}

function parseYamlDocument(raw: string): TaskFormatYamlDocument {
  const document: TaskFormatYamlDocument = {
    formats: {},
    aliases: {},
    manual_overrides: {},
  };

  let section: keyof TaskFormatYamlDocument | null = null;
  let currentFormatId: NormalizedTaskFormatId | null = null;
  let currentListKey: keyof TaskFormatYamlAliasGroup | null = null;

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, "");
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const indent = countIndent(line);

    if (indent === 0) {
      if (!trimmed.endsWith(":")) {
        continue;
      }
      section = trimmed.slice(0, -1) as keyof TaskFormatYamlDocument;
      currentFormatId = null;
      currentListKey = null;
      continue;
    }

    if (indent === 2) {
      if (!trimmed.endsWith(":") || !section) {
        continue;
      }
      currentFormatId = trimmed.slice(0, -1) as NormalizedTaskFormatId;
      currentListKey = null;
      if (section === "formats") {
        document.formats[currentFormatId] ??= { title: currentFormatId, sort_order: 9999 };
      } else if (section === "aliases") {
        document.aliases ??= {};
        document.aliases[currentFormatId] ??= {};
      } else if (section === "manual_overrides") {
        document.manual_overrides ??= {};
        document.manual_overrides[currentFormatId] ??= [];
      }
      continue;
    }

    if (!section || !currentFormatId) {
      continue;
    }

    if (section === "formats" && indent === 4) {
      const [rawKey, ...rest] = trimmed.split(":");
      const key = rawKey.trim() as keyof TaskFormatYamlEntry;
      const value = rest.join(":").trim();
      const entry = document.formats[currentFormatId] ?? { title: currentFormatId, sort_order: 9999 };
      if (key === "sort_order") {
        entry.sort_order = parseNumber(value);
      } else if (key === "title" || key === "description") {
        entry[key] = parseScalar(value);
      }
      document.formats[currentFormatId] = entry;
      continue;
    }

    if (section === "aliases") {
      const group = document.aliases?.[currentFormatId] ?? {};

      if (indent === 4) {
        const [rawKey, ...rest] = trimmed.split(":");
        const key = rawKey.trim() as keyof TaskFormatYamlAliasGroup;
        const value = rest.join(":").trim();
        currentListKey = key;
        if (key === "priority") {
          group.priority = parseNumber(value);
          currentListKey = null;
        } else if (!value) {
          if (key === "exact" || key === "excludes") {
            group[key] ??= [];
          } else if (key === "contains_all") {
            group[key] ??= [];
          }
        }
        document.aliases![currentFormatId] = group;
        continue;
      }

      if (indent === 6 && trimmed.startsWith("- ") && currentListKey) {
        const value = trimmed.slice(2).trim();
        if (currentListKey === "contains_all") {
          group.contains_all ??= [];
          group.contains_all.push(parseInlineArray(value));
        } else if (currentListKey === "exact" || currentListKey === "excludes") {
          group[currentListKey] ??= [];
          group[currentListKey]!.push(parseScalar(value));
        }
        document.aliases![currentFormatId] = group;
      }
      continue;
    }

    if (section === "manual_overrides" && indent === 4 && trimmed.startsWith("- ")) {
      document.manual_overrides?.[currentFormatId]?.push(parseScalar(trimmed.slice(2).trim()));
    }
  }

  return document;
}

function toCatalog(doc: TaskFormatYamlDocument): TaskFormatCatalogEntry[] {
  return Object.entries(doc.formats ?? {})
    .map(([id, entry]) => ({
      id: id as NormalizedTaskFormatId,
      title: entry?.title ?? id,
      description: entry?.description ?? null,
      sortOrder: Number(entry?.sort_order ?? 9999),
    }))
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function toAliasRules(doc: TaskFormatYamlDocument): TaskFormatAliasRule[] {
  return Object.entries(doc.aliases ?? {})
    .map(([formatId, group]) => ({
      formatId: formatId as NormalizedTaskFormatId,
      aliases: [...(group?.exact ?? [])],
      containsAll: [...(group?.contains_all ?? [])],
      excludes: [...(group?.excludes ?? [])],
      priority: group?.priority,
    }))
    .filter((rule) => rule.aliases.length || rule.containsAll.length || rule.excludes?.length || rule.priority != null)
    .sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
}

function toManualOverrides(doc: TaskFormatYamlDocument): TaskFormatManualOverride[] {
  return Object.entries(doc.manual_overrides ?? {})
    .flatMap(([formatId, values]) =>
      (values ?? []).map((rawValue) => ({
        rawValue,
        formatId: formatId as NormalizedTaskFormatId,
      }))
    )
    .sort((left, right) => left.rawValue.localeCompare(right.rawValue, "ru"));
}

export function parseTaskFormatConfigYaml(raw: string): TaskFormatConfig {
  const document = parseYamlDocument(raw);
  return {
    catalog: toCatalog(document),
    aliasRules: toAliasRules(document),
    manualOverrides: toManualOverrides(document),
  };
}

export const taskFormatConfig = parseTaskFormatConfigYaml(taskFormatConfigYaml);
