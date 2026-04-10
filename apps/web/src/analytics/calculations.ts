import type { GroupV1, PersonV1, SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";
import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import type { DesignerSortBucketId } from "../designerSort/types";
import type { TaskFormatConfig } from "../formatSort/types";
import { resolveNormalizedTaskFormat, UNSORTED_FORMAT_ID } from "../formatSort/resolver";
import { toShortPersonName } from "../utils/personName";
import type {
  AnalyticsDonutBreakdown,
  AnalyticsDonutTaskLine,
  AnalyticsDesignerConfig,
  AnalyticsTaskRef,
  DepartmentAnalyticsConfig,
  DepartmentAnalyticsReport,
  DesignerBucketResolution,
  MonthlyDepartmentAnalyticsRow,
} from "./types";

type ProductionMilestone = {
  actual: string;
  sortValue: string;
};

function monthKeyToLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, (month || 1) - 1, 1));
  return date.toLocaleDateString("ru-RU", { month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function monthKeyToParts(monthKey: string): { year: number; month: number } {
  const [year, month] = monthKey.split("-").map(Number);
  return {
    year: Number.isFinite(year) ? year : 1970,
    month: Number.isFinite(month) ? month : 1,
  };
}

function toMonthIndex(monthKey: string): number {
  const { year, month } = monthKeyToParts(monthKey);
  return year * 12 + (month - 1);
}

function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function resolveDesignerDisplayName(task: TaskV1, peopleById: Map<string, PersonV1>): string | null {
  if (task.ownerId && peopleById.has(task.ownerId)) return peopleById.get(task.ownerId)?.name ?? null;
  if (task.ownerName?.trim()) return task.ownerName.trim();
  if (task.ownerId?.trim()) return "Неизвестный дизайнер";
  return null;
}

function normalizeDesignerKey(designerId: string | null, displayName: string | null): string {
  const normalizedName = normalizeIdentity(displayName);
  if (designerId?.trim()) {
    return `id:${designerId.trim()}`;
  }
  return `name:${normalizedName || "unknown"}`;
}

function milestoneLooksLikeProduction(type: string, label: string): boolean {
  const normalized = `${normalizeIdentity(type)} ${normalizeIdentity(label)}`;
  if (!normalized) return false;
  if (normalized.includes("эфир") || normalized.includes("air")) return false;
  return normalized.includes("финал") || normalized.includes("сдач");
}

function findProductionDate(task: TaskV1, snapshot: SnapshotV1): string | null {
  const milestoneTypeLabels = snapshot.enums?.milestoneType ?? {};
  const matches: ProductionMilestone[] = [];

  for (const milestone of task.milestones ?? []) {
    if (!milestone.actual) continue;
    const label = milestoneTypeLabels[milestone.type] ?? milestone.type;
    if (!milestoneLooksLikeProduction(milestone.type, label)) continue;
    matches.push({
      actual: milestone.actual,
      sortValue: milestone.actual,
    });
  }

  if (matches.length) {
    matches.sort((left, right) => left.sortValue.localeCompare(right.sortValue));
    return matches[matches.length - 1]?.actual ?? null;
  }

  if ((task.status === "done" || task.status === "pre_done") && task.end) {
    return task.end;
  }
  return null;
}

function resolveShowName(task: TaskV1, groupsById: Map<string, GroupV1>): string | null {
  if (task.groupId && groupsById.has(task.groupId)) {
    return groupsById.get(task.groupId)?.name ?? null;
  }
  return null;
}

function resolveDesignerBucket(
  task: TaskV1,
  snapshot: SnapshotV1,
  designerConfig: AnalyticsDesignerConfig | null
): DesignerBucketResolution {
  const assignments = designerConfig?.assignments ?? [];
  if (!assignments.length) {
    return { bucketId: "staff", hasExplicitConfig: false };
  }

  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  const displayName = resolveDesignerDisplayName(task, peopleById);
  const fullKey = normalizeDesignerKey(task.ownerId ?? null, displayName);
  const shortKey = normalizeDesignerKey(null, displayName ? toShortPersonName(displayName) : null);
  const normalizedDisplay = normalizeIdentity(displayName);

  const match =
    assignments.find((entry) => entry.designerKey === fullKey) ??
    assignments.find((entry) => entry.designerKey === shortKey) ??
    assignments.find((entry) => normalizeIdentity(entry.designerKey) === normalizedDisplay);

  return {
    bucketId: match?.bucketId ?? "unsorted",
    hasExplicitConfig: true,
  };
}

function shouldIncludeBucket(bucketId: DesignerSortBucketId, config: DepartmentAnalyticsConfig): boolean {
  if (bucketId === "staff") return true;
  if (bucketId === "outsource") return config.includeOutsource;
  if (bucketId === "web_digital") return config.includeWebDigital;
  return false;
}

function buildTaskRef(
  task: TaskV1,
  snapshot: SnapshotV1,
  productionDate: string,
  formatConfig: TaskFormatConfig
): AnalyticsTaskRef {
  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  const groupsById = new Map((snapshot.groups ?? []).map((group) => [group.id, group]));
  const designerName = resolveDesignerDisplayName(task, peopleById);
  return {
    id: task.id,
    title: task.title,
    brand: task.brand ?? null,
    show: resolveShowName(task, groupsById),
    designerName,
    formatId: resolveNormalizedTaskFormat(task.format_ ?? task.type ?? null, formatConfig),
    productionDate,
    task,
  };
}

export async function computeAutoHoursPerDesigner(snapshot: SnapshotV1): Promise<{ hours: number; details: string }> {
  const productionYears = new Set<number>();
  for (const task of snapshot.tasks) {
    const productionDate = findProductionDate(task, snapshot);
    if (!productionDate) continue;
    productionYears.add(Number(productionDate.slice(0, 4)));
  }

  const years = [...productionYears].filter(Number.isFinite).sort((left, right) => left - right);
  if (!years.length) {
    return { hours: 151, details: "Нет production-дат, используем fallback 151 ч/мес." };
  }

  const startYear = years[0];
  const endYear = years[years.length - 1];
  const holidaySet = await fetchRuHolidayAndTransferDaysInRange(startYear, endYear);
  let totalAdjustedHours = 0;

  for (const year of years) {
    let workdays = 0;
    for (let month = 0; month < 12; month += 1) {
      const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(Date.UTC(year, month, day));
        const weekday = date.getUTCDay();
        if (weekday === 0 || weekday === 6) continue;
        const iso = date.toISOString().slice(0, 10);
        if (holidaySet.has(iso)) continue;
        workdays += 1;
      }
    }
    const adjustedWorkdays = Math.max(0, workdays - 28);
    totalAdjustedHours += adjustedWorkdays * 8;
  }

  const averageMonthlyHours = totalAdjustedHours / (years.length * 12);
  return {
    hours: Number(averageMonthlyHours.toFixed(1)),
    details: `Среднее по ${years.length} г. с учётом 28 дней отпуска.`,
  };
}

export function buildDepartmentAnalyticsReport(
  snapshot: SnapshotV1,
  analyticsConfig: DepartmentAnalyticsConfig,
  designerConfig: AnalyticsDesignerConfig | null,
  formatConfig: TaskFormatConfig,
  autoHoursPerDesigner: number
): DepartmentAnalyticsReport {
  const monthMap = new Map<string, MonthlyDepartmentAnalyticsRow>();
  const formatTitles = new Map(formatConfig.catalog.map((entry) => [entry.id, entry.title]));
  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  let usedDesignerConfig = false;

  for (const task of snapshot.tasks) {
    const productionDate = findProductionDate(task, snapshot);
    if (!productionDate) continue;

    const bucketResolution = resolveDesignerBucket(task, snapshot, designerConfig);
    usedDesignerConfig = usedDesignerConfig || bucketResolution.hasExplicitConfig;
    if (!shouldIncludeBucket(bucketResolution.bucketId, analyticsConfig)) continue;

    const monthKey = productionDate.slice(0, 7);
    const taskRef = buildTaskRef(task, snapshot, productionDate, formatConfig);
    const designerName = resolveDesignerDisplayName(task, peopleById);
    const existing =
      monthMap.get(monthKey) ??
      {
        monthKey,
        monthLabel: monthKeyToLabel(monthKey),
        tasksByFormat: {},
        completedTaskCount: 0,
        practicalHours: 0,
        activeDesignerCount: 0,
        activeDesignerNames: [],
        theoreticalCapacityHours: 0,
        unsortedTaskCount: 0,
        unsortedTasks: [],
      };

    existing.completedTaskCount += 1;
    if (designerName && !existing.activeDesignerNames.includes(designerName)) {
      existing.activeDesignerNames.push(designerName);
    }

    if (taskRef.formatId === UNSORTED_FORMAT_ID) {
      existing.unsortedTaskCount += 1;
      existing.unsortedTasks.push(taskRef);
    } else {
      existing.tasksByFormat[taskRef.formatId] ??= [];
      existing.tasksByFormat[taskRef.formatId].push(taskRef);
      existing.practicalHours += analyticsConfig.formatHoursById[taskRef.formatId] ?? 0;
    }

    monthMap.set(monthKey, existing);
  }

  const rows = [...monthMap.values()]
    .map((row) => {
      const sortedNames = [...row.activeDesignerNames].sort((left, right) => left.localeCompare(right, "ru"));
      const activeDesignerCount = sortedNames.length;
      return {
        ...row,
        activeDesignerNames: sortedNames,
        activeDesignerCount,
        theoreticalCapacityHours: Number((activeDesignerCount * autoHoursPerDesigner).toFixed(1)),
      };
    })
    .sort((left, right) => left.monthKey.localeCompare(right.monthKey));

  const topCounts = new Map<string, number>();
  let totalTasks = 0;
  let totalPracticalHours = 0;
  let totalTheoreticalHours = 0;
  let totalDesignerMonths = 0;

  for (const row of rows) {
    totalTasks += row.completedTaskCount;
    totalPracticalHours += row.practicalHours;
    totalTheoreticalHours += row.theoreticalCapacityHours;
    totalDesignerMonths += row.activeDesignerCount;
    for (const entry of formatConfig.catalog) {
      const count = row.tasksByFormat[entry.id]?.length ?? 0;
      if (!count) continue;
      topCounts.set(entry.id, (topCounts.get(entry.id) ?? 0) + count);
    }
    if (row.unsortedTaskCount) {
      topCounts.set(UNSORTED_FORMAT_ID, (topCounts.get(UNSORTED_FORMAT_ID) ?? 0) + row.unsortedTaskCount);
    }
  }

  const topFormats = [...topCounts.entries()]
    .map(([formatId, count]) => ({
      formatId: formatId as keyof typeof analyticsConfig.formatHoursById | "unsorted",
      title: formatId === UNSORTED_FORMAT_ID ? "Несортировано" : formatTitles.get(formatId as any) ?? formatId,
      count,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  return {
    rows,
    summary: {
      totalTasks,
      totalPracticalHours: Number(totalPracticalHours.toFixed(1)),
      totalTheoreticalHours: Number(totalTheoreticalHours.toFixed(1)),
      averageHoursPerActiveDesigner:
        totalDesignerMonths > 0 ? Number((totalPracticalHours / totalDesignerMonths).toFixed(1)) : 0,
      topFormats,
    },
    autoHoursPerDesigner,
    autoHoursDetails: usedDesignerConfig
      ? "Категории дизайнеров учтены из local designer-sort config."
      : "Designer-sort config не найден, все дизайнеры временно считаются штатными.",
  };
}

function clampPositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

export function buildAnalyticsMovingAverage(values: number[], windowSize: number): number[] {
  const width = clampPositiveInteger(windowSize, 3);
  return values.map((_, index) => {
    const start = Math.max(0, index - width + 1);
    const slice = values.slice(start, index + 1);
    const total = slice.reduce((sum, value) => sum + value, 0);
    return Number((total / slice.length).toFixed(1));
  });
}

function formatPeriodMonthLabel(anchorDate: Date): string {
  return anchorDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function formatPeriodQuarterLabel(anchorDate: Date): string {
  const quarter = Math.floor(anchorDate.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${anchorDate.getUTCFullYear()}`;
}

function formatPeriodYearLabel(anchorDate: Date): string {
  return String(anchorDate.getUTCFullYear());
}

function toIsoDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseAnchorDate(value: string): Date {
  const parsed = new Date(`${value || "1970-01-01"}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? parsed : new Date();
}

function buildRangeFromConfig(config: DepartmentAnalyticsConfig): {
  startMonthIndex: number;
  endMonthIndex: number;
  periodLabel: string;
} {
  const anchor = parseAnchorDate(config.donutAnchorDate);
  if (config.donutPeriodMode === "month") {
    const monthKey = toIsoDateOnly(new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1))).slice(0, 7);
    const index = toMonthIndex(monthKey);
    return {
      startMonthIndex: index,
      endMonthIndex: index,
      periodLabel: formatPeriodMonthLabel(anchor),
    };
  }

  if (config.donutPeriodMode === "quarter") {
    const quarterStartMonth = Math.floor(anchor.getUTCMonth() / 3) * 3;
    const startKey = toIsoDateOnly(new Date(Date.UTC(anchor.getUTCFullYear(), quarterStartMonth, 1))).slice(0, 7);
    const startIndex = toMonthIndex(startKey);
    return {
      startMonthIndex: startIndex,
      endMonthIndex: startIndex + 2,
      periodLabel: formatPeriodQuarterLabel(anchor),
    };
  }

  if (config.donutPeriodMode === "custom") {
    const start = parseAnchorDate(config.donutCustomStart || config.donutAnchorDate);
    const end = parseAnchorDate(config.donutCustomEnd || config.donutAnchorDate);
    const startDate = start <= end ? start : end;
    const endDate = start <= end ? end : start;
    const startIndex = toMonthIndex(toIsoDateOnly(new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1))).slice(0, 7));
    const endIndex = toMonthIndex(toIsoDateOnly(new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), 1))).slice(0, 7));
    return {
      startMonthIndex: startIndex,
      endMonthIndex: endIndex,
      periodLabel: `${toIsoDateOnly(startDate)} - ${toIsoDateOnly(endDate)}`,
    };
  }

  const yearKey = toIsoDateOnly(new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1))).slice(0, 7);
  const startIndex = toMonthIndex(yearKey);
  return {
    startMonthIndex: startIndex,
    endMonthIndex: startIndex + 11,
    periodLabel: formatPeriodYearLabel(anchor),
  };
}

export function buildAnalyticsDonutBreakdown(
  report: DepartmentAnalyticsReport,
  config: DepartmentAnalyticsConfig,
  formatConfig: TaskFormatConfig
): AnalyticsDonutBreakdown {
  const range = buildRangeFromConfig(config);
  const formatTitles = new Map(formatConfig.catalog.map((entry) => [entry.id, entry.title]));
  const segments = new Map<
    string,
    {
      formatId: AnalyticsDonutBreakdown["segments"][number]["formatId"];
      title: string;
      taskCount: number;
      hours: number;
      tasks: AnalyticsDonutTaskLine[];
    }
  >();

  for (const row of report.rows) {
    const monthIndex = toMonthIndex(row.monthKey);
    if (monthIndex < range.startMonthIndex || monthIndex > range.endMonthIndex) continue;

    for (const [formatId, tasks] of Object.entries(row.tasksByFormat)) {
      const typedFormatId = formatId as AnalyticsDonutBreakdown["segments"][number]["formatId"];
      const current = segments.get(formatId) ?? {
        formatId: typedFormatId,
        title: formatTitles.get(formatId as any) ?? formatId,
        taskCount: 0,
        hours: 0,
        tasks: [],
      };
      current.taskCount += tasks.length;
      current.hours += tasks.length * (config.formatHoursById[typedFormatId as keyof typeof config.formatHoursById] ?? 0);
      current.tasks.push(...tasks.map<AnalyticsDonutTaskLine>((task) => ({
        id: task.id,
        brand: task.brand,
        show: task.show,
      })));
      segments.set(formatId, current);
    }

    if (row.unsortedTaskCount > 0) {
      const current = segments.get(UNSORTED_FORMAT_ID) ?? {
        formatId: UNSORTED_FORMAT_ID,
        title: "Несортировано",
        taskCount: 0,
        hours: 0,
        tasks: [],
      };
      current.taskCount += row.unsortedTaskCount;
      current.tasks.push(...row.unsortedTasks.map<AnalyticsDonutTaskLine>((task) => ({
        id: task.id,
        brand: task.brand,
        show: task.show,
      })));
      segments.set(UNSORTED_FORMAT_ID, current);
    }
  }

  const ordered = [...segments.values()].filter((segment) => segment.taskCount > 0);
  const totalHours = ordered.reduce((sum, segment) => sum + segment.hours, 0);
  const totalTasks = ordered.reduce((sum, segment) => sum + segment.taskCount, 0);

  return {
    periodLabel: range.periodLabel,
    totalHours: Number(totalHours.toFixed(1)),
    totalTasks,
    segments: ordered
      .map((segment) => ({
        ...segment,
        hours: Number(segment.hours.toFixed(1)),
        share: totalHours > 0 ? segment.hours / totalHours : 0,
      }))
      .sort((left, right) => right.hours - left.hours),
  };
}
