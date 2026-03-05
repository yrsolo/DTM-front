export type TimeRange = {
  start: Date;
  end: Date;
};

export type RenderTask = {
  id: string;
  title: string;
  ownerId?: string | null;
  ownerName?: string | null;
  brand?: string | null;
  customer?: string | null;
  format_?: string | null;
  history?: string | null;
  groupId?: string;
  groupName?: string | null;
  status: string;
  start: Date | null;
  end: Date | null;
  milestones?: Array<{
    type: string;
    status: string;
    date: Date;
  }>;
};
