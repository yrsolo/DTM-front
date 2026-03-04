export type DesignControls = {
  desktopLeftColWidth: number;
  tableRowHeight: number;
  tableCellPadX: number;
  tableCellPadY: number;
  badgeHeight: number;
  badgeFontSize: number;
  tasksTitleCol: number;
  tasksStatusCol: number;
  designersNameCol: number;
  designersTasksCol: number;
  designersLoadCol: number;
  timelineWidth: number;
  timelineMinHeight: number;
  timelineTopOffset: number;
  timelineDateLabelY: number;
  timelineLabelWidth: number;
  timelineStripeOpacity: number;
  timelineGridOpacity: number;
  barInsetY: number;
  barRadius: number;
  cardPadding: number;
};

export const DEFAULT_DESIGN_CONTROLS: DesignControls = {
  desktopLeftColWidth: 420,
  tableRowHeight: 44,
  tableCellPadX: 8,
  tableCellPadY: 0,
  badgeHeight: 24,
  badgeFontSize: 11,
  tasksTitleCol: 72,
  tasksStatusCol: 28,
  designersNameCol: 56,
  designersTasksCol: 18,
  designersLoadCol: 26,
  timelineWidth: 760,
  timelineMinHeight: 260,
  timelineTopOffset: 20,
  timelineDateLabelY: 12,
  timelineLabelWidth: 200,
  timelineStripeOpacity: 0.08,
  timelineGridOpacity: 1,
  barInsetY: 8,
  barRadius: 8,
  cardPadding: 14,
};

export const DESIGN_CONTROLS_STORAGE_KEY = "dtm.web.designControls.v1";

export type DesignControlItem = {
  key: keyof DesignControls;
  label: string;
  min: number;
  max: number;
  step: number;
};

export const DESIGN_CONTROL_ITEMS: DesignControlItem[] = [
  { key: "desktopLeftColWidth", label: "Left panel width", min: 320, max: 620, step: 1 },
  { key: "tableRowHeight", label: "Table row height", min: 28, max: 72, step: 1 },
  { key: "tableCellPadX", label: "Cell padding X", min: 2, max: 24, step: 1 },
  { key: "tableCellPadY", label: "Cell padding Y", min: 0, max: 16, step: 1 },
  { key: "badgeHeight", label: "Badge height", min: 16, max: 40, step: 1 },
  { key: "badgeFontSize", label: "Badge font size", min: 9, max: 16, step: 1 },
  { key: "tasksTitleCol", label: "Tasks title col %", min: 20, max: 90, step: 1 },
  { key: "tasksStatusCol", label: "Tasks status col %", min: 10, max: 60, step: 1 },
  { key: "designersNameCol", label: "Designers name col %", min: 35, max: 75, step: 1 },
  { key: "designersTasksCol", label: "Designers tasks col %", min: 10, max: 35, step: 1 },
  { key: "designersLoadCol", label: "Designers load col %", min: 10, max: 40, step: 1 },
  { key: "timelineWidth", label: "Timeline width", min: 520, max: 1400, step: 1 },
  { key: "timelineMinHeight", label: "Timeline min height", min: 180, max: 700, step: 1 },
  { key: "timelineTopOffset", label: "Timeline top offset", min: 0, max: 60, step: 1 },
  { key: "timelineDateLabelY", label: "Date labels Y", min: 4, max: 28, step: 1 },
  { key: "timelineLabelWidth", label: "Timeline label width", min: 120, max: 340, step: 1 },
  { key: "timelineStripeOpacity", label: "Stripe opacity", min: 0, max: 0.3, step: 0.01 },
  { key: "timelineGridOpacity", label: "Grid opacity", min: 0.2, max: 1, step: 0.01 },
  { key: "barInsetY", label: "Bar inset Y", min: 2, max: 20, step: 1 },
  { key: "barRadius", label: "Bar radius", min: 2, max: 20, step: 1 },
  { key: "cardPadding", label: "Card padding", min: 8, max: 28, step: 1 },
];

export function normalizeDesignControls(input: Partial<DesignControls>): DesignControls {
  return {
    ...DEFAULT_DESIGN_CONTROLS,
    ...input,
  };
}
