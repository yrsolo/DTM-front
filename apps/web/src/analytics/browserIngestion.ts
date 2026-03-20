import type { SnapshotV1 } from "@dtm/schema/snapshot";
import { loadPublicConfig } from "../config/publicConfig";
import { getApiProxyRequestBase, getRuntimeContour } from "../config/runtimeContour";
import { normalizeToSnapshotV1 } from "../data/normalize";
import type { AnalyticsSourceDataset } from "./types";

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function buildMonthlyWindows(startIso: string, endIso: string) {
  const windows: Array<{ start: string; end: string }> = [];
  let cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cursor <= end) {
    const next = addMonths(cursor, 1);
    windows.push({
      start: cursor.toISOString().slice(0, 10),
      end: new Date(next.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    cursor = next;
  }
  return windows;
}

function extractTaskDateCoverage(snapshot: SnapshotV1) {
  const dates: string[] = [];
  for (const task of snapshot.tasks) {
    for (const candidate of [task.start, task.end, task.nextDue]) {
      const iso = toIsoDate(candidate);
      if (iso) dates.push(iso);
    }
    for (const milestone of task.milestones ?? []) {
      const planned = toIsoDate(milestone.planned);
      const actual = toIsoDate(milestone.actual);
      if (planned) dates.push(planned);
      if (actual) dates.push(actual);
    }
  }
  if (!dates.length) {
    return { start: "2024-01-01", end: "2027-12-31" };
  }
  dates.sort();
  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);
  return {
    start: addMonths(first, -1).toISOString().slice(0, 10),
    end: addMonths(last, 2).toISOString().slice(0, 10),
  };
}

async function fetchFrontendPayload(params: URLSearchParams): Promise<any> {
  const cfg = await loadPublicConfig();
  const base = `${getApiProxyRequestBase().replace(/\/+$/, "")}${cfg.apiFrontendPath}`;
  const response = await fetch(`${base}?${params.toString()}`, {
    credentials: "include",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return await response.json();
}

function mergeSnapshotParts(parts: SnapshotV1[]): SnapshotV1 {
  const taskMap = new Map<string, SnapshotV1["tasks"][number]>();
  const peopleMap = new Map<string, SnapshotV1["people"][number]>();
  const groupMap = new Map<string, NonNullable<SnapshotV1["groups"]>[number]>();
  let latestEnums: SnapshotV1["enums"] = {};
  let latestMeta = parts[0]?.meta ?? { version: "v1" as const, generatedAt: new Date().toISOString() };

  for (const part of parts) {
    latestMeta = part.meta ?? latestMeta;
    latestEnums = { ...latestEnums, ...(part.enums ?? {}) };
    for (const task of part.tasks ?? []) {
      taskMap.set(task.id, task);
    }
    for (const person of part.people ?? []) {
      peopleMap.set(person.id, person);
    }
    for (const group of part.groups ?? []) {
      groupMap.set(group.id, group);
    }
  }

  return {
    meta: latestMeta,
    people: [...peopleMap.values()].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    groups: [...groupMap.values()].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    tasks: [...taskMap.values()].sort((left, right) => left.id.localeCompare(right.id)),
    enums: latestEnums,
  };
}

export async function downloadAnalyticsSnapshotFromBrowser(): Promise<AnalyticsSourceDataset> {
  const seedParams = new URLSearchParams({
    statuses: "work,pre_done,done,wait",
    include_people: "true",
    limit: "1000",
  });
  const seedPayload = await fetchFrontendPayload(seedParams);
  if (seedPayload?.meta?.access?.mode !== "full") {
    throw new Error("Для полной выгрузки нужен full-access snapshot без маскирования.");
  }

  const seedSnapshot = normalizeToSnapshotV1(seedPayload);
  const expectedTotal = Number(seedPayload?.summary?.tasksTotal ?? seedPayload?.summary?.tasksReturned ?? seedSnapshot.tasks.length);
  const coverage = extractTaskDateCoverage(seedSnapshot);
  const windows = buildMonthlyWindows(coverage.start, coverage.end);
  const parts: SnapshotV1[] = [seedSnapshot];

  for (const window of windows) {
    const params = new URLSearchParams({
      statuses: "work,pre_done,done,wait",
      include_people: "true",
      limit: "1000",
      window_start: window.start,
      window_end: window.end,
      window_mode: "intersects",
    });
    const payload = await fetchFrontendPayload(params);
    if (payload?.meta?.access?.mode !== "full") {
      throw new Error("Во время window-fetch snapshot перестал быть full-access.");
    }
    parts.push(normalizeToSnapshotV1(payload));
  }

  const snapshot = mergeSnapshotParts(parts);
  const dataset: AnalyticsSourceDataset = {
    snapshot,
    contour: getRuntimeContour(),
    generatedAt: new Date().toISOString(),
    tasksTotalExpected: expectedTotal,
    tasksTotalCollected: snapshot.tasks.length,
    sourceMeta: {
      seedMeta: seedPayload?.meta ?? null,
      seedSummary: seedPayload?.summary ?? null,
      windows,
      source: "browser-manual-refresh",
    },
  };

  if (expectedTotal && dataset.tasksTotalCollected < expectedTotal) {
    throw new Error(`Неполная выгрузка: собрано ${dataset.tasksTotalCollected}, ожидалось ${expectedTotal}.`);
  }

  return dataset;
}
