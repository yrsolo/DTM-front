import type { GroupV1, PersonV1, SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";
import { fetchRuHolidayAndTransferDaysInRange } from "../calendar/ruNonWorkingDays";
import type { DesignerSortBucketId } from "../designerSort/types";
import { taskFormatConfig } from "../formatSort/config";
import { resolveNormalizedTaskFormat, UNSORTED_FORMAT_ID } from "../formatSort/resolver";
import { toShortPersonName } from "../utils/personName";
import type {
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

function buildTaskRef(task: TaskV1, snapshot: SnapshotV1, productionDate: string): AnalyticsTaskRef {
  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  const groupsById = new Map((snapshot.groups ?? []).map((group) => [group.id, group]));
  const designerName = resolveDesignerDisplayName(task, peopleById);
  return {
    id: task.id,
    title: task.title,
    brand: task.brand ?? null,
    show: resolveShowName(task, groupsById),
    designerName,
    formatId: resolveNormalizedTaskFormat(task.format_ ?? task.type ?? null, taskFormatConfig),
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
  autoHoursPerDesigner: number
): DepartmentAnalyticsReport {
  const monthMap = new Map<string, MonthlyDepartmentAnalyticsRow>();
  const formatTitles = new Map(taskFormatConfig.catalog.map((entry) => [entry.id, entry.title]));
  const peopleById = new Map(snapshot.people.map((person) => [person.id, person]));
  let usedDesignerConfig = false;

  for (const task of snapshot.tasks) {
    const productionDate = findProductionDate(task, snapshot);
    if (!productionDate) continue;

    const bucketResolution = resolveDesignerBucket(task, snapshot, designerConfig);
    usedDesignerConfig = usedDesignerConfig || bucketResolution.hasExplicitConfig;
    if (!shouldIncludeBucket(bucketResolution.bucketId, analyticsConfig)) continue;

    const monthKey = productionDate.slice(0, 7);
    const taskRef = buildTaskRef(task, snapshot, productionDate);
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
    for (const entry of taskFormatConfig.catalog) {
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
