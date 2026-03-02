export type SnapshotMetaV1 = {
  version: "v1";
  generatedAt: string; // ISO 8601 datetime
  source?: string;
  hash?: string; // e.g. sha256:...
};

export type PersonV1 = {
  id: string;
  name: string;
};

export type GroupV1 = {
  id: string;
  name: string;
};

export type TaskLinksV1 = {
  sheetRowUrl?: string;
  externalUrl?: string;
};

export type TaskV1 = {
  id: string;
  title: string;
  ownerId?: string; // optional: unassigned tasks allowed
  status: string;
  start?: string; // ISO date or datetime
  end?: string; // ISO date or datetime
  tags?: string[];
  groupId?: string;
  deps?: string[]; // task ids
  links?: TaskLinksV1;
  notes?: string;
};

export type SnapshotEnumsV1 = {
  status?: Record<string, string>; // code -> human label
};

export type SnapshotV1 = {
  meta: SnapshotMetaV1;
  people: PersonV1[];
  tasks: TaskV1[];
  groups?: GroupV1[];
  enums?: SnapshotEnumsV1;
};
