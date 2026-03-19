export type NormalizedTaskFormatId =
  | "grafrolik"
  | "logo_integration"
  | "shorts"
  | "shooting_video"
  | "logo_3d"
  | "interactive_ustnik"
  | "first_person_announce"
  | "still_frame"
  | "graphic_transition"
  | "screencast"
  | "video_adaptation"
  | "screen_branding"
  | "dynamic_logo"
  | "electronic_logo"
  | "branded_qr"
  | "web";

export type TaskFormatCatalogEntry = {
  id: NormalizedTaskFormatId;
  title: string;
  description?: string | null;
  sortOrder: number;
};

export type TaskFormatAliasRule = {
  formatId: NormalizedTaskFormatId;
  aliases?: string[];
  containsAll?: string[][];
  excludes?: string[];
  priority?: number;
};

export type TaskFormatManualOverride = {
  rawValue: string;
  formatId: NormalizedTaskFormatId;
};

export type TaskFormatConfig = {
  catalog: TaskFormatCatalogEntry[];
  aliasRules: TaskFormatAliasRule[];
  manualOverrides: TaskFormatManualOverride[];
};

export type TaskFormatSampleTask = {
  id: string;
  title: string;
};

export type RawTaskFormatEntry = {
  rawValue: string;
  normalizedRawValue: string;
  count: number;
  sampleTasks: TaskFormatSampleTask[];
  autoMatchFormatId: NormalizedTaskFormatId | null;
  manualFormatId: NormalizedTaskFormatId | null;
};

export type FormatSortTaskSnapshot = {
  id: string;
  title: string;
  format_: string | null;
  type: string | null;
  ownerId: string | null;
  ownerName: string | null;
  brand: string | null;
  groupId: string | null;
  status: string;
  start: string | null;
  end: string | null;
  nextDue: string | null;
};

export type TaskFormatSourceSnapshot = {
  generatedAt: string;
  contour: "test" | "prod";
  tasksTotalExpected: number;
  tasksTotalCollected: number;
  sourceMeta: Record<string, unknown>;
  tasks: FormatSortTaskSnapshot[];
};

export type BrowserFormatSortDataset = {
  snapshot: TaskFormatSourceSnapshot;
  inventory: RawTaskFormatEntry[];
};
