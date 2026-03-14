export type SnapshotMetaV1 = {
  version: "v1";
  generatedAt: string; // ISO 8601 datetime
  source?: string;
  hash?: string; // e.g. sha256:...
};

export type PersonV1 = {
  id: string;
  name: string;
  position?: string | null;
};

export type GroupV1 = {
  id: string;
  name: string;
};

export type TaskLinksV1 = {
  sheetRowUrl?: string | null;
  externalUrl?: string;
  self?: string;
};

export type TaskAttachmentLinksV1 = {
  // Opaque backend-owned links. Frontend must not synthesize URLs from attachment ids.
  view?: string | null;
  download?: string | null;
};

export type TaskAttachmentMetaV1 = {
  preview?: string | null;
};

export type TaskAttachmentV1 = {
  id: string;
  name: string;
  mime: string;
  kind: string;
  sizeBytes: number;
  status: string;
  uploadedAt?: string | null;
  capabilities?: string[];
  meta?: TaskAttachmentMetaV1;
  links?: TaskAttachmentLinksV1;
};

export type MilestoneV1 = {
  type: string; // storyboard, animatic, etc.
  planned?: string; // YYYY-MM-DD
  actual?: string | null;
  status: string; // planned | done | unknown | skipped
};

export type TaskV1 = {
  id: string;
  title: string;
  ownerId?: string | null; // optional: unassigned tasks allowed
  ownerName?: string | null;
  brand?: string | null;
  customer?: string | null;
  format_?: string | null;
  type?: string | null;
  status: string;
  start?: string; // ISO date
  end?: string; // ISO date
  nextDue?: string | null; // ISO date (v2)
  tags?: string[];
  groupId?: string;
  deps?: string[]; // task ids
  links?: TaskLinksV1;
  notes?: string;
  history?: string | null;
  milestones?: MilestoneV1[];
  attachments?: TaskAttachmentV1[];
  hash?: string | null;
  revision?: string | null;
};

export type SnapshotEnumsV1 = {
  status?: Record<string, string>; // code -> human label
  statusGroups?: Record<string, string[]>;
  milestoneType?: Record<string, string>;
  milestoneStatus?: Record<string, string>;
};

export type SnapshotV1 = {
  meta: SnapshotMetaV1;
  people: PersonV1[];
  tasks: TaskV1[];
  groups?: GroupV1[];
  enums?: SnapshotEnumsV1;
};
