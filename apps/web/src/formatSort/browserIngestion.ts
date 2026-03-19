import { getApiProxyRequestBase, getRuntimeContour } from "../config/runtimeContour";
import type {
  BrowserFormatSortDataset,
  FormatSortTaskSnapshot,
  TaskFormatConfig,
  TaskFormatSourceSnapshot,
} from "./types";
import { buildRawTaskFormatInventory } from "./resolver";

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

function extractTaskDateCoverage(tasks: any[]) {
  const dates: string[] = [];
  for (const task of tasks) {
    const candidateValues = [task?.date?.start, task?.date?.end, task?.date?.nextDue, task?.start, task?.end, task?.nextDue];
    for (const candidate of candidateValues) {
      const iso = toIsoDate(candidate);
      if (iso) dates.push(iso);
    }
    for (const milestone of task?.milestones ?? []) {
      const planned = toIsoDate(milestone?.planned);
      const actual = toIsoDate(milestone?.actual);
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

function normalizeTask(task: any): FormatSortTaskSnapshot {
  return {
    id: String(task.id ?? ""),
    title: typeof task.title === "string" ? task.title : "Untitled",
    format_: typeof task.format_ === "string" ? task.format_ : null,
    type: typeof task.type === "string" ? task.type : null,
    ownerId:
      typeof task.ownerId === "string"
        ? task.ownerId
        : typeof task.owner_id === "string"
          ? task.owner_id
          : typeof task.designerId === "string"
            ? task.designerId
            : null,
    ownerName:
      typeof task.ownerName === "string"
        ? task.ownerName
        : typeof task.designer === "string"
          ? task.designer
          : typeof task.owner === "string"
            ? task.owner
            : null,
    brand: typeof task.brand === "string" ? task.brand : null,
    groupId: typeof task.groupId === "string" ? task.groupId : null,
    status: typeof task.status === "string" ? task.status : "",
    start: typeof task?.date?.start === "string" ? task.date.start : typeof task.start === "string" ? task.start : null,
    end: typeof task?.date?.end === "string" ? task.date.end : typeof task.end === "string" ? task.end : null,
    nextDue:
      typeof task?.date?.nextDue === "string"
        ? task.date.nextDue
        : typeof task.nextDue === "string"
          ? task.nextDue
          : null,
  };
}

async function fetchFrontendPayload(params: URLSearchParams): Promise<any> {
  const base = `${getApiProxyRequestBase().replace(/\/+$/, "")}/v2/frontend`;
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

export async function downloadAllTasksFromBrowser(config: TaskFormatConfig): Promise<BrowserFormatSortDataset> {
  const seedParams = new URLSearchParams({
    statuses: "work,pre_done,done,wait",
    include_people: "true",
    limit: "1000",
  });
  const seedPayload = await fetchFrontendPayload(seedParams);
  if (seedPayload?.meta?.access?.mode !== "full") {
    throw new Error("Для полной выгрузки нужен full-access snapshot без маскирования.");
  }

  const expectedTotal = Number(seedPayload?.summary?.tasksTotal ?? seedPayload?.summary?.tasksReturned ?? 0);
  const coverage = extractTaskDateCoverage(seedPayload?.tasks ?? []);
  const windows = buildMonthlyWindows(coverage.start, coverage.end);
  const taskMap = new Map<string, FormatSortTaskSnapshot>();

  for (const task of seedPayload?.tasks ?? []) {
    const normalized = normalizeTask(task);
    if (normalized.id) taskMap.set(normalized.id, normalized);
  }

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
    for (const task of payload?.tasks ?? []) {
      const normalized = normalizeTask(task);
      if (normalized.id) taskMap.set(normalized.id, normalized);
    }
  }

  const snapshot: TaskFormatSourceSnapshot = {
    generatedAt: new Date().toISOString(),
    contour: getRuntimeContour(),
    tasksTotalExpected: expectedTotal,
    tasksTotalCollected: taskMap.size,
    sourceMeta: {
      seedMeta: seedPayload?.meta ?? null,
      seedSummary: seedPayload?.summary ?? null,
      windows,
      source: "browser-manual-refresh",
    },
    tasks: [...taskMap.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };

  if (expectedTotal && snapshot.tasksTotalCollected < expectedTotal) {
    throw new Error(`Неполная выгрузка: собрано ${snapshot.tasksTotalCollected}, ожидалось ${expectedTotal}.`);
  }

  return {
    snapshot,
    inventory: buildRawTaskFormatInventory(snapshot, config),
  };
}
