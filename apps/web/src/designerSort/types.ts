import type { TaskFormatSampleTask, TaskFormatSourceSnapshot } from "../formatSort/types";

export type DesignerSortBucketId = "unsorted" | "staff" | "outsource" | "web_digital";

export type DesignerSortBucket = {
  id: DesignerSortBucketId;
  title: string;
  description: string;
  sortOrder: number;
};

export type DesignerSortAssignment = {
  designerKey: string;
  bucketId: DesignerSortBucketId;
};

export type DesignerSortConfig = {
  assignments: DesignerSortAssignment[];
};

export type DesignerSortEntry = {
  designerKey: string;
  designerId: string | null;
  displayName: string;
  normalizedName: string;
  taskCount: number;
  sampleTasks: TaskFormatSampleTask[];
  sampleBrands: string[];
};

export type BrowserDesignerSortDataset = {
  snapshot: TaskFormatSourceSnapshot;
};
