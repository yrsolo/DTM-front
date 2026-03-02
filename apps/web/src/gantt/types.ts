export type TimeRange = {
  start: Date;
  end: Date;
};

export type RenderTask = {
  id: string;
  title: string;
  ownerId?: string;
  status: string;
  start: Date | null;
  end: Date | null;
  groupId?: string;
};
