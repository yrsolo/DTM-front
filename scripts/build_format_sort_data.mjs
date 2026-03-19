import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(REPO_ROOT, "apps/web/src/content/formatSort/taskFormatConfig.json");
const SNAPSHOT_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "apps/web/src/content/formatSort/taskFormatSourceSnapshot.generated.json"
);
const INVENTORY_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "apps/web/src/content/formatSort/taskFormatInventory.generated.json"
);

function parseArgs(argv) {
  const result = {
    target: "prod",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") {
      result.target = argv[i + 1] ?? result.target;
      i += 1;
    }
  }
  if (result.target !== "prod" && result.target !== "test") {
    throw new Error("Usage: node scripts/build_format_sort_data.mjs --target prod|test");
  }
  return result;
}

function importDotEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const name = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (name !== "YC_SA_JSON_CREDENTIALS") {
      const commentIndex = value.indexOf("#");
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }
    if (name && value && !process.env[name]) {
      process.env[name] = value;
    }
  }
}

function parseSimpleYaml(raw) {
  const result = {};
  let currentSection = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    if (!line || line.trimStart().startsWith("#")) continue;
    const match = line.match(/^(\s*)([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) continue;
    const [, indent, key, value] = match;
    if (indent.length === 0) {
      result[key] = {};
      currentSection = key;
      continue;
    }
    if (!currentSection) continue;
    result[currentSection][key] = value.trim();
  }
  return result;
}

function loadDeployConfig() {
  const raw = fs.readFileSync(path.join(REPO_ROOT, "config/deploy.yaml"), "utf8");
  return parseSimpleYaml(raw);
}

function normalizeFormatText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function buildManualOverrideMap(overrides) {
  return new Map(
    (overrides ?? [])
      .map((entry) => [normalizeFormatText(entry.rawValue), entry.formatId])
      .filter(([key]) => key.length > 0)
  );
}

function resolveNormalizedTaskFormat(rawFormat, config, withManual = true) {
  const normalizedRawValue = normalizeFormatText(rawFormat);
  if (!normalizedRawValue) return "unsorted";

  if (withManual) {
    const manualMatch = buildManualOverrideMap(config.manualOverrides).get(normalizedRawValue);
    if (manualMatch) return manualMatch;
  }

  const sortedRules = [...(config.aliasRules ?? [])].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  for (const rule of sortedRules) {
    const aliases = (rule.aliases ?? []).map((entry) => normalizeFormatText(entry)).filter(Boolean);
    if (aliases.includes(normalizedRawValue)) {
      return rule.formatId;
    }
    const excludes = (rule.excludes ?? []).map((entry) => normalizeFormatText(entry)).filter(Boolean);
    for (const containsRule of rule.containsAll ?? []) {
      const normalizedTokens = containsRule.map((entry) => normalizeFormatText(entry)).filter(Boolean);
      if (!normalizedTokens.length) continue;
      if (excludes.some((token) => normalizedRawValue.includes(token))) continue;
      if (normalizedTokens.every((token) => normalizedRawValue.includes(token))) {
        return rule.formatId;
      }
    }
  }
  return "unsorted";
}

function toIsoDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function addMonths(date, months) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  return next;
}

function buildMonthlyWindows(startIso, endIso) {
  const windows = [];
  let cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  while (cursor <= end) {
    const next = addMonths(cursor, 1);
    const windowStart = cursor.toISOString().slice(0, 10);
    const windowEnd = new Date(next.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    windows.push({ start: windowStart, end: windowEnd });
    cursor = next;
  }
  return windows;
}

function extractTaskDateCoverage(tasks) {
  const dates = [];
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
  const paddedStart = addMonths(first, -1).toISOString().slice(0, 10);
  const paddedEnd = addMonths(last, 2).toISOString().slice(0, 10);
  return { start: paddedStart, end: paddedEnd };
}

function normalizeTask(task) {
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

function buildInventory(snapshot, config) {
  const grouped = new Map();
  const manualMap = buildManualOverrideMap(config.manualOverrides);
  for (const task of snapshot.tasks) {
    const rawValue = (task.format_ ?? task.type ?? "").trim();
    if (!rawValue) continue;
    const normalizedRawValue = normalizeFormatText(rawValue);
    const existing = grouped.get(normalizedRawValue);
    if (existing) {
      existing.count += 1;
      if (existing.sampleTasks.length < 3) {
        existing.sampleTasks.push({ id: task.id, title: task.title });
      }
      continue;
    }
    const autoMatch = resolveNormalizedTaskFormat(rawValue, config, false);
    grouped.set(normalizedRawValue, {
      rawValue,
      normalizedRawValue,
      count: 1,
      sampleTasks: [{ id: task.id, title: task.title }],
      autoMatchFormatId: autoMatch === "unsorted" ? null : autoMatch,
      manualFormatId: manualMap.get(normalizedRawValue) ?? null,
    });
  }
  return [...grouped.values()].sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.rawValue.localeCompare(right.rawValue, "ru");
  });
}

async function fetchJson(url, headers) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }
  return await response.json();
}

async function main() {
  const { target } = parseArgs(process.argv.slice(2));
  importDotEnv();
  const proxySecret = process.env.BROWSER_AUTH_PROXY_SECRET?.trim();
  if (!proxySecret) {
    throw new Error("Missing BROWSER_AUTH_PROXY_SECRET in environment or .env");
  }

  const deployConfig = loadDeployConfig();
  const yc = deployConfig.yandex_cloud ?? {};
  const apiOrigin = target === "test" ? yc.api_origin_test : yc.api_origin_prod;
  if (!apiOrigin) {
    throw new Error(`Missing api origin for target=${target}`);
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  const baseUrl = `${String(apiOrigin).replace(/\/+$/, "")}/api/v2/frontend`;
  const headers = {
    accept: "application/json",
    "x-dtm-proxy-secret": proxySecret,
    "x-dtm-access-mode": "full",
    "x-dtm-authenticated": "1",
    "x-dtm-contour": target,
    "x-dtm-user-id": "format-sort-script",
    "x-dtm-user-role": "admin",
    "x-dtm-user-status": "approved",
  };

  const seedParams = new URLSearchParams({
    statuses: "work,pre_done,done,wait",
    include_people: "true",
    limit: "1000",
  });
  const seedPayload = await fetchJson(`${baseUrl}?${seedParams.toString()}`, headers);
  const expectedTotal = Number(seedPayload?.summary?.tasksTotal ?? seedPayload?.summary?.tasksReturned ?? 0);
  const coverage = extractTaskDateCoverage(seedPayload?.tasks ?? []);
  const windows = buildMonthlyWindows(coverage.start, coverage.end);
  const taskMap = new Map();

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
    const payload = await fetchJson(`${baseUrl}?${params.toString()}`, headers);
    for (const task of payload?.tasks ?? []) {
      const normalized = normalizeTask(task);
      if (normalized.id) taskMap.set(normalized.id, normalized);
    }
  }

  const snapshot = {
    generatedAt: new Date().toISOString(),
    contour: target,
    tasksTotalExpected: expectedTotal,
    tasksTotalCollected: taskMap.size,
    sourceMeta: {
      apiOrigin,
      seedMeta: seedPayload?.meta ?? null,
      seedSummary: seedPayload?.summary ?? null,
      windows,
    },
    tasks: [...taskMap.values()].sort((left, right) => left.id.localeCompare(right.id)),
  };

  if (expectedTotal && snapshot.tasksTotalCollected < expectedTotal) {
    throw new Error(
      `Incomplete task snapshot: collected ${snapshot.tasksTotalCollected}, expected ${expectedTotal}. ` +
      `Try widening the date windows or investigate missing undated tasks.`
    );
  }

  const inventory = buildInventory(snapshot, config);
  fs.writeFileSync(SNAPSHOT_OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  fs.writeFileSync(INVENTORY_OUTPUT_PATH, `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        target,
        tasksTotalExpected: snapshot.tasksTotalExpected,
        tasksTotalCollected: snapshot.tasksTotalCollected,
        rawFormats: inventory.length,
        snapshotPath: path.relative(REPO_ROOT, SNAPSHOT_OUTPUT_PATH),
        inventoryPath: path.relative(REPO_ROOT, INVENTORY_OUTPUT_PATH),
      },
      null,
      2
    )
  );
}

await main();
