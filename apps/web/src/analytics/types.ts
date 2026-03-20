import type { SnapshotV1, TaskV1 } from "@dtm/schema/snapshot";
import type { DesignerSortAssignment, DesignerSortBucketId } from "../designerSort/types";
import type { NormalizedTaskFormatId } from "../formatSort/types";

export type DepartmentCapacityMode = "auto" | "manual";

export type AnalyticsSourceDataset = {
  snapshot: SnapshotV1;
  contour: "test" | "prod";
  generatedAt: string;
  tasksTotalExpected: number;
  tasksTotalCollected: number;
  sourceMeta: Record<string, unknown>;
};

export type DepartmentAnalyticsConfig = {
  formatHoursById: Record<NormalizedTaskFormatId, number>;
  capacityMode: DepartmentCapacityMode;
  manualHoursPerDesigner: number;
  includeOutsource: boolean;
  includeWebDigital: boolean;
};

export type AnalyticsDesignerConfig = {
  assignments: DesignerSortAssignment[];
};

export type AnalyticsTaskRef = {
  id: string;
  title: string;
  brand: string | null;
  show: string | null;
  designerName: string | null;
  formatId: NormalizedTaskFormatId | "unsorted";
  productionDate: string;
  task: TaskV1;
};

export type MonthlyDepartmentAnalyticsRow = {
  monthKey: string;
  monthLabel: string;
  tasksByFormat: Record<string, AnalyticsTaskRef[]>;
  completedTaskCount: number;
  practicalHours: number;
  activeDesignerCount: number;
  activeDesignerNames: string[];
  theoreticalCapacityHours: number;
  unsortedTaskCount: number;
  unsortedTasks: AnalyticsTaskRef[];
};

export type DepartmentAnalyticsSummary = {
  totalTasks: number;
  totalPracticalHours: number;
  totalTheoreticalHours: number;
  averageHoursPerActiveDesigner: number;
  topFormats: Array<{ formatId: NormalizedTaskFormatId | "unsorted"; title: string; count: number }>;
};

export type DepartmentAnalyticsReport = {
  rows: MonthlyDepartmentAnalyticsRow[];
  summary: DepartmentAnalyticsSummary;
  autoHoursPerDesigner: number;
  autoHoursDetails: string;
};

export type DesignerBucketResolution = {
  bucketId: DesignerSortBucketId;
  hasExplicitConfig: boolean;
};
