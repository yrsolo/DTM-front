import { resolvePublicAssetUrl } from "../config/publicPaths";

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
  timelineLeftOwnerFontSize: number;
  timelineLeftOwnerXOffset: number;
  timelineLeftOwnerTextOffsetY: number;
  timelineLeftOwnerCropLeft: number;
  timelineLeftTaskFontSize: number;
  timelineLeftTaskXOffset: number;
  timelineLeftTaskTextOffsetY: number;
  timelineLeftTaskCropLeft: number;
  timelineLeftMetaFontSize: number;
  timelineLeftMetaTextOffsetY: number;
  timelineLeftPillOffsetY: number;
  timelineLeftPillXOffset: number;
  timelineLeftPillWidth: number;
  timelineLeftPillSizeScale: number;
  timelineLeftGroupOffsetY: number;
  timelineLeftGroupXOffset: number;
  timelineLeftGroupCropLeft: number;
  timelineLeftGroupFontSize: number;
  timelineStripeOpacity: number;
  timelineGridOpacity: number;
  timelineGridLineWidth: number;
  timelineLabelEveryDay: number;
  timelineDateFontSize: number;
  timelineDateIdleOpacity: number;
  timelineDateHoverOpacity: number;
  timelineMonthFontSize: number;
  timelineMonthOffsetY: number;
  timelineMonthOffsetX: number;
  timelineTodayLineOpacity: number;
  timelineTodayLineWidth: number;
  timelineCursorTrailDays: number;
  timelineCursorTrailOpacity: number;
  timelineHolidayFillOpacity: number;
  timelineWeekendFullDay: number;
  timelineWeekendFillOpacity: number;
  timelinePerfMinWeekPxDetailedX10: number;
  timelineShowMilestoneLabels: number;
  timelineModeDockOffsetX: number;
  timelineModeDockOffsetY: number;
  timelineModeDockScale: number;
  timelineTopControlDockOffsetX: number;
  timelineTopControlDockOffsetY: number;
  tooltipOffsetX: number;
  tooltipOffsetY: number;
  tooltipBubbleScale: number;
  barInsetY: number;
  barRadius: number;
  textRenderingMode: number;
  textSmoothingMode: number;
  cardPadding: number;
  matBgPinkOpacity: number;
  matBgBlueOpacity: number;
  matBgMintOpacity: number;
  sceneDimOpacity: number;
  matCardBorderOpacity: number;
  matCardShadowStrength: number;
  matCardInsetStrength: number;
  matTopbarBorderOpacity: number;
  topbarGlowOpacity: number;
  topbarBgOpacity: number;
  matActiveGlowStrength: number;
  matButtonGlowStrength: number;
  matBadgeGlowStrength: number;
  matRowHoverStrength: number;
  matScrollbarGlowStrength: number;
  milestoneSizeScale: number;
  milestoneOpacity: number;
  taskColorMixPercent: number;
  designersCardTintStrength: number;
  drawerWidth: number;
  drawerPadding: number;
  drawerTitleSize: number;
  drawerMetaGap: number;
  drawerSectionGap: number;
  drawerMiniDatesFontSize: number;
  drawerMilestoneDateFontSize: number;
  drawerMilestoneRowGap: number;
  drawerCalendarCellHeight: number;
  drawerCalendarDayFontSize: number;
  drawerCalendarRadius: number;
  drawerCalendarMonthTintOpacity: number;
  drawerCalendarWeekendTintOpacity: number;
  drawerCalendarHolidayTintOpacity: number;
  drawerMilestoneCellGlowOpacity: number;
  drawerMilestoneCellShadowOpacity: number;
  drawerMilestoneDotSize: number;
  drawerMilestoneLabelFontSize: number;
  drawerMilestoneLabelMaxWidth: number;
  drawerMonthLabelFontSize: number;
  drawerMilestoneDayShadowOpacity: number;
  drawerMilestoneCellDarkShadowOpacity: number;
  drawerMilestoneCellDarkShadowBlur: number;
  drawerPanelBorderOpacity: number;
  drawerPanelShadowStrength: number;
  drawerPanelInsetStrength: number;
  drawerPanelGlowOpacity: number;
  animEnabled: number;
  animDrawerDurationMs: number;
  animDrawerEasePreset: number;
  animReorderDurationMs: number;
  animReorderEasePreset: number;
  animReorderStaggerMs: number;
  animReorderStaggerCapMs: number;
  animReorderDistanceFactor: number;
  animReorderDistanceMaxExtraMs: number;
  animReorderViewportOnly: number;
  animReorderViewportBufferPx: number;
  animReorderAutoDisableRows: number;
  workbenchDockLeft: number;
  workbenchDockRight: number;
  workbenchDockBottom: number;
  workbenchWidthMax: number;
  workbenchViewportMargin: number;
  workbenchBodyMaxHeightVh: number;
  workbenchBodyPadding: number;
  workbenchMainGap: number;
  workbenchTabsGap: number;
  workbenchTabFontSize: number;
  workbenchTabPadY: number;
  workbenchTabPadX: number;
  workbenchSideWidth: number;
  workbenchGridMinCol: number;
  workbenchGridGap: number;
  workbenchGroupPadding: number;
  workbenchControlGap: number;
  workbenchActionBtnFontSize: number;
  workbenchActionBtnPadY: number;
  workbenchActionBtnPadX: number;
  workbenchSliderWidth: number;
  workbenchNumberWidth: number;
  workbenchLabelMinWidth: number;
  workbenchColorTextWidth: number;
  workbenchControlLabelFontSize: number;
  workbenchControlInputFontSize: number;
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
  timelineLeftOwnerFontSize: 20,
  timelineLeftOwnerXOffset: 0,
  timelineLeftOwnerTextOffsetY: 20,
  timelineLeftOwnerCropLeft: 0,
  timelineLeftTaskFontSize: 12,
  timelineLeftTaskXOffset: 0,
  timelineLeftTaskTextOffsetY: 20,
  timelineLeftTaskCropLeft: 0,
  timelineLeftMetaFontSize: 10,
  timelineLeftMetaTextOffsetY: 19,
  timelineLeftPillOffsetY: 5,
  timelineLeftPillXOffset: 0,
  timelineLeftPillWidth: 74,
  timelineLeftPillSizeScale: 1,
  timelineLeftGroupOffsetY: 20,
  timelineLeftGroupXOffset: 0,
  timelineLeftGroupCropLeft: 0,
  timelineLeftGroupFontSize: 12,
  timelineStripeOpacity: 0.08,
  timelineGridOpacity: 1,
  timelineGridLineWidth: 0.8,
  timelineLabelEveryDay: 1,
  timelineDateFontSize: 10,
  timelineDateIdleOpacity: 0.52,
  timelineDateHoverOpacity: 1,
  timelineMonthFontSize: 10,
  timelineMonthOffsetY: -2,
  timelineMonthOffsetX: 0,
  timelineTodayLineOpacity: 0.65,
  timelineTodayLineWidth: 1.2,
  timelineCursorTrailDays: 5,
  timelineCursorTrailOpacity: 0.22,
  timelineHolidayFillOpacity: 0.2,
  timelineWeekendFullDay: 1,
  timelineWeekendFillOpacity: 0.12,
  timelinePerfMinWeekPxDetailedX10: 40,
  timelineShowMilestoneLabels: 1,
  timelineModeDockOffsetX: 0,
  timelineModeDockOffsetY: 0,
  timelineModeDockScale: 1,
  timelineTopControlDockOffsetX: 0,
  timelineTopControlDockOffsetY: 0,
  tooltipOffsetX: 8,
  tooltipOffsetY: 8,
  tooltipBubbleScale: 1,
  barInsetY: 8,
  barRadius: 8,
  textRenderingMode: 0,
  textSmoothingMode: 1,
  cardPadding: 14,
  matBgPinkOpacity: 0.24,
  matBgBlueOpacity: 0.28,
  matBgMintOpacity: 0.18,
  sceneDimOpacity: 0,
  matCardBorderOpacity: 0.24,
  matCardShadowStrength: 0.45,
  matCardInsetStrength: 0.25,
  matTopbarBorderOpacity: 0.26,
  topbarGlowOpacity: 0.09,
  topbarBgOpacity: 0.95,
  matActiveGlowStrength: 0.28,
  matButtonGlowStrength: 0.25,
  matBadgeGlowStrength: 0.22,
  matRowHoverStrength: 0.2,
  matScrollbarGlowStrength: 0.5,
  milestoneSizeScale: 1,
  milestoneOpacity: 0.95,
  taskColorMixPercent: 28,
  designersCardTintStrength: 0.24,
  drawerWidth: 520,
  drawerPadding: 16,
  drawerTitleSize: 18,
  drawerMetaGap: 8,
  drawerSectionGap: 12,
  drawerMiniDatesFontSize: 12,
  drawerMilestoneDateFontSize: 11,
  drawerMilestoneRowGap: 8,
  drawerCalendarCellHeight: 54,
  drawerCalendarDayFontSize: 12,
  drawerCalendarRadius: 10,
  drawerCalendarMonthTintOpacity: 0.2,
  drawerCalendarWeekendTintOpacity: 0.15,
  drawerCalendarHolidayTintOpacity: 0.18,
  drawerMilestoneCellGlowOpacity: 0.32,
  drawerMilestoneCellShadowOpacity: 0.28,
  drawerMilestoneDotSize: 6,
  drawerMilestoneLabelFontSize: 10,
  drawerMilestoneLabelMaxWidth: 68,
  drawerMonthLabelFontSize: 10,
  drawerMilestoneDayShadowOpacity: 0.55,
  drawerMilestoneCellDarkShadowOpacity: 0.38,
  drawerMilestoneCellDarkShadowBlur: 28,
  drawerPanelBorderOpacity: 0.2,
  drawerPanelShadowStrength: 0.2,
  drawerPanelInsetStrength: 0.12,
  drawerPanelGlowOpacity: 0.28,
  animEnabled: 0,
  animDrawerDurationMs: 220,
  animDrawerEasePreset: 2,
  animReorderDurationMs: 280,
  animReorderEasePreset: 2,
  animReorderStaggerMs: 8,
  animReorderStaggerCapMs: 120,
  animReorderDistanceFactor: 0.35,
  animReorderDistanceMaxExtraMs: 180,
  animReorderViewportOnly: 1,
  animReorderViewportBufferPx: 160,
  animReorderAutoDisableRows: 120,
  workbenchDockLeft: 12,
  workbenchDockRight: 12,
  workbenchDockBottom: 12,
  workbenchWidthMax: 2160,
  workbenchViewportMargin: 12,
  workbenchBodyMaxHeightVh: 76,
  workbenchBodyPadding: 8,
  workbenchMainGap: 8,
  workbenchTabsGap: 6,
  workbenchTabFontSize: 13,
  workbenchTabPadY: 4,
  workbenchTabPadX: 6,
  workbenchSideWidth: 460,
  workbenchGridMinCol: 240,
  workbenchGridGap: 8,
  workbenchGroupPadding: 8,
  workbenchControlGap: 8,
  workbenchActionBtnFontSize: 12,
  workbenchActionBtnPadY: 6,
  workbenchActionBtnPadX: 8,
  workbenchSliderWidth: 220,
  workbenchNumberWidth: 86,
  workbenchLabelMinWidth: 120,
  workbenchColorTextWidth: 110,
  workbenchControlLabelFontSize: 11,
  workbenchControlInputFontSize: 12,
};

export const DESIGN_CONTROLS_STORAGE_KEY = "dtm.web.designControls.v1";
export const DESIGN_CONTROLS_PUBLIC_PATH = resolvePublicAssetUrl("config/design-controls.json");

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
  { key: "timelineLeftOwnerFontSize", label: "Left owner font", min: 12, max: 36, step: 1 },
  { key: "timelineLeftOwnerXOffset", label: "Left owner X", min: -80, max: 120, step: 1 },
  { key: "timelineLeftOwnerTextOffsetY", label: "Left owner Y", min: 10, max: 40, step: 1 },
  { key: "timelineLeftOwnerCropLeft", label: "Left owner crop right", min: 0, max: 220, step: 1 },
  { key: "timelineLeftTaskFontSize", label: "Left task font", min: 9, max: 20, step: 1 },
  { key: "timelineLeftTaskXOffset", label: "Left task X", min: -80, max: 120, step: 1 },
  { key: "timelineLeftTaskTextOffsetY", label: "Left task Y", min: 10, max: 34, step: 1 },
  { key: "timelineLeftTaskCropLeft", label: "Left task crop right", min: 0, max: 220, step: 1 },
  { key: "timelineLeftMetaFontSize", label: "Left meta font", min: 8, max: 18, step: 1 },
  { key: "timelineLeftMetaTextOffsetY", label: "Left meta Y", min: 10, max: 34, step: 1 },
  { key: "timelineLeftPillOffsetY", label: "Left pill Y", min: 0, max: 24, step: 1 },
  { key: "timelineLeftPillXOffset", label: "Left pill X", min: -120, max: 120, step: 1 },
  { key: "timelineLeftPillWidth", label: "Left pill width", min: 52, max: 140, step: 1 },
  { key: "timelineLeftPillSizeScale", label: "Left pill size", min: 0.5, max: 2.5, step: 0.01 },
  { key: "timelineLeftGroupOffsetY", label: "Left group Y", min: 10, max: 34, step: 1 },
  { key: "timelineLeftGroupXOffset", label: "Left group X", min: -120, max: 160, step: 1 },
  { key: "timelineLeftGroupCropLeft", label: "Left group crop right", min: 0, max: 220, step: 1 },
  { key: "timelineLeftGroupFontSize", label: "Left group font", min: 8, max: 20, step: 1 },
  { key: "timelineStripeOpacity", label: "Stripe opacity", min: 0, max: 0.3, step: 0.01 },
  { key: "timelineGridOpacity", label: "Grid opacity", min: 0.2, max: 1, step: 0.01 },
  { key: "timelineGridLineWidth", label: "Grid line width", min: 0.2, max: 2, step: 0.1 },
  { key: "timelineLabelEveryDay", label: "Date label every day (0/1)", min: 0, max: 1, step: 1 },
  { key: "timelineDateFontSize", label: "Date font size", min: 8, max: 16, step: 1 },
  { key: "timelineDateIdleOpacity", label: "Date idle opacity", min: 0.1, max: 1, step: 0.01 },
  { key: "timelineDateHoverOpacity", label: "Date hover opacity", min: 0.1, max: 1, step: 0.01 },
  { key: "timelineMonthFontSize", label: "Month font size", min: 8, max: 16, step: 1 },
  { key: "timelineMonthOffsetY", label: "Month Y", min: -16, max: 14, step: 1 },
  { key: "timelineMonthOffsetX", label: "Month X", min: -40, max: 40, step: 1 },
  { key: "timelineTodayLineOpacity", label: "Today line opacity", min: 0, max: 1, step: 0.01 },
  { key: "timelineTodayLineWidth", label: "Today line width", min: 0.5, max: 4, step: 0.1 },
  { key: "timelineCursorTrailDays", label: "Cursor trail days", min: 0, max: 20, step: 0.25 },
  { key: "timelineCursorTrailOpacity", label: "Cursor trail opacity", min: 0, max: 1, step: 0.01 },
  { key: "timelineHolidayFillOpacity", label: "Holiday fill opacity", min: 0, max: 0.5, step: 0.01 },
  { key: "timelineWeekendFullDay", label: "Weekend full-day fill (0/1)", min: 0, max: 1, step: 1 },
  { key: "timelineWeekendFillOpacity", label: "Weekend fill opacity", min: 0, max: 0.35, step: 0.01 },
  { key: "timelinePerfMinWeekPxDetailedX10", label: "Perf: min week px for details (x10)", min: 1, max: 120, step: 1 },
  { key: "timelineShowMilestoneLabels", label: "Show milestone labels (0/1)", min: 0, max: 1, step: 1 },
  { key: "timelineModeDockOffsetX", label: "Mode panel X", min: -500, max: 500, step: 1 },
  { key: "timelineModeDockOffsetY", label: "Mode panel Y", min: -240, max: 240, step: 1 },
  { key: "timelineModeDockScale", label: "Mode panel scale", min: 0.6, max: 2, step: 0.01 },
  { key: "timelineTopControlDockOffsetX", label: "Zoom panel X", min: -500, max: 500, step: 1 },
  { key: "timelineTopControlDockOffsetY", label: "Zoom panel Y", min: -240, max: 240, step: 1 },
  { key: "tooltipOffsetX", label: "Tooltip offset X", min: -120, max: 180, step: 1 },
  { key: "tooltipOffsetY", label: "Tooltip offset Y", min: -120, max: 180, step: 1 },
  { key: "tooltipBubbleScale", label: "Tooltip bubbles size", min: 0.6, max: 2.2, step: 0.01 },
  { key: "barInsetY", label: "Bar inset Y", min: 2, max: 20, step: 1 },
  { key: "barRadius", label: "Bar radius", min: 2, max: 20, step: 1 },
  { key: "animEnabled", label: "Animations enabled (0/1)", min: 0, max: 1, step: 1 },
  { key: "animDrawerDurationMs", label: "Drawer animation ms", min: 0, max: 700, step: 1 },
  { key: "animDrawerEasePreset", label: "Drawer easing preset (0..4)", min: 0, max: 4, step: 1 },
  { key: "animReorderDurationMs", label: "Reorder animation ms", min: 0, max: 1000, step: 1 },
  { key: "animReorderEasePreset", label: "Reorder easing preset (0..4)", min: 0, max: 4, step: 1 },
  { key: "animReorderStaggerMs", label: "Reorder stagger ms", min: 0, max: 20, step: 1 },
  { key: "animReorderStaggerCapMs", label: "Reorder stagger cap ms", min: 0, max: 200, step: 1 },
  { key: "animReorderDistanceFactor", label: "Reorder distance factor", min: 0, max: 1, step: 0.01 },
  { key: "animReorderDistanceMaxExtraMs", label: "Reorder distance max extra ms", min: 0, max: 400, step: 1 },
  { key: "animReorderViewportOnly", label: "Reorder viewport-only (0/1)", min: 0, max: 1, step: 1 },
  { key: "animReorderViewportBufferPx", label: "Reorder viewport buffer px", min: 0, max: 500, step: 1 },
  { key: "animReorderAutoDisableRows", label: "Reorder auto-disable rows", min: 1, max: 1000, step: 1 },
  { key: "textRenderingMode", label: "Text rendering mode (0..3)", min: 0, max: 3, step: 1 },
  { key: "textSmoothingMode", label: "Text smoothing mode (0..2)", min: 0, max: 2, step: 1 },
  { key: "milestoneSizeScale", label: "Milestone size", min: 0.4, max: 2.5, step: 0.01 },
  { key: "milestoneOpacity", label: "Milestone opacity", min: 0.05, max: 1, step: 0.01 },
  { key: "taskColorMixPercent", label: "Task random color %", min: 0, max: 100, step: 1 },
  { key: "designersCardTintStrength", label: "Designers cards tint strength", min: 0, max: 0.8, step: 0.01 },
  { key: "cardPadding", label: "Card padding", min: 8, max: 28, step: 1 },
  { key: "workbenchDockLeft", label: "Workbench dock left", min: 0, max: 80, step: 1 },
  { key: "workbenchDockRight", label: "Workbench dock right", min: 0, max: 80, step: 1 },
  { key: "workbenchDockBottom", label: "Workbench dock bottom", min: 0, max: 80, step: 1 },
  { key: "workbenchWidthMax", label: "Workbench max width", min: 900, max: 3200, step: 1 },
  { key: "workbenchViewportMargin", label: "Workbench viewport margin", min: 0, max: 120, step: 1 },
  { key: "workbenchBodyMaxHeightVh", label: "Workbench max height vh", min: 30, max: 95, step: 1 },
  { key: "workbenchBodyPadding", label: "Workbench body padding", min: 4, max: 26, step: 1 },
  { key: "workbenchMainGap", label: "Workbench main gap", min: 2, max: 24, step: 1 },
  { key: "workbenchTabsGap", label: "Workbench tabs gap", min: 2, max: 20, step: 1 },
  { key: "workbenchTabFontSize", label: "Workbench tab font", min: 10, max: 22, step: 1 },
  { key: "workbenchTabPadY", label: "Workbench tab pad Y", min: 3, max: 18, step: 1 },
  { key: "workbenchTabPadX", label: "Workbench tab pad X", min: 4, max: 24, step: 1 },
  { key: "workbenchSideWidth", label: "Workbench side width", min: 160, max: 760, step: 1 },
  { key: "workbenchGridMinCol", label: "Workbench min grid col", min: 150, max: 460, step: 1 },
  { key: "workbenchGridGap", label: "Workbench grid gap", min: 2, max: 24, step: 1 },
  { key: "workbenchGroupPadding", label: "Workbench group padding", min: 4, max: 24, step: 1 },
  { key: "workbenchControlGap", label: "Workbench control gap", min: 2, max: 20, step: 1 },
  { key: "workbenchActionBtnFontSize", label: "Workbench action font", min: 9, max: 18, step: 1 },
  { key: "workbenchActionBtnPadY", label: "Workbench action pad Y", min: 3, max: 14, step: 1 },
  { key: "workbenchActionBtnPadX", label: "Workbench action pad X", min: 4, max: 20, step: 1 },
  { key: "workbenchSliderWidth", label: "Workbench slider width", min: 120, max: 420, step: 1 },
  { key: "workbenchNumberWidth", label: "Workbench number width", min: 56, max: 180, step: 1 },
  { key: "workbenchLabelMinWidth", label: "Workbench label min", min: 70, max: 260, step: 1 },
  { key: "workbenchColorTextWidth", label: "Workbench color text width", min: 70, max: 220, step: 1 },
  { key: "workbenchControlLabelFontSize", label: "Workbench label font", min: 9, max: 20, step: 1 },
  { key: "workbenchControlInputFontSize", label: "Workbench input font", min: 9, max: 20, step: 1 },
  { key: "drawerWidth", label: "Drawer width", min: 360, max: 760, step: 1 },
  { key: "drawerPadding", label: "Drawer padding", min: 8, max: 36, step: 1 },
  { key: "drawerTitleSize", label: "Drawer title size", min: 14, max: 30, step: 1 },
  { key: "drawerMetaGap", label: "Drawer meta gap", min: 2, max: 24, step: 1 },
  { key: "drawerSectionGap", label: "Drawer section gap", min: 6, max: 28, step: 1 },
  { key: "drawerMiniDatesFontSize", label: "Drawer dates font", min: 9, max: 16, step: 1 },
  { key: "drawerMilestoneDateFontSize", label: "Milestone date font", min: 9, max: 16, step: 1 },
  { key: "drawerMilestoneRowGap", label: "Milestone rows gap", min: 2, max: 20, step: 1 },
  { key: "drawerCalendarCellHeight", label: "Calendar cell height", min: 34, max: 90, step: 1 },
  { key: "drawerCalendarDayFontSize", label: "Calendar day font", min: 9, max: 18, step: 1 },
  { key: "drawerCalendarRadius", label: "Calendar cell radius", min: 2, max: 18, step: 1 },
  { key: "drawerCalendarMonthTintOpacity", label: "Month tint opacity", min: 0, max: 0.5, step: 0.01 },
  { key: "drawerCalendarWeekendTintOpacity", label: "Weekend tint opacity", min: 0, max: 0.5, step: 0.01 },
  { key: "drawerCalendarHolidayTintOpacity", label: "Holiday tint opacity", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerMilestoneCellGlowOpacity", label: "Cell glow opacity", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellShadowOpacity", label: "Cell inset shadow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneDotSize", label: "Milestone dot size", min: 2, max: 16, step: 1 },
  { key: "drawerMilestoneLabelFontSize", label: "Milestone label font", min: 8, max: 16, step: 1 },
  { key: "drawerMilestoneLabelMaxWidth", label: "Milestone label width", min: 30, max: 130, step: 1 },
  { key: "drawerMonthLabelFontSize", label: "Month label font", min: 8, max: 14, step: 1 },
  { key: "drawerMilestoneDayShadowOpacity", label: "Day shadow opacity", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellDarkShadowOpacity", label: "Cell dark shadow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellDarkShadowBlur", label: "Cell dark shadow blur", min: 0, max: 80, step: 1 },
  { key: "drawerPanelBorderOpacity", label: "Drawer panel border", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerPanelShadowStrength", label: "Drawer panel shadow", min: 0, max: 0.8, step: 0.01 },
  { key: "drawerPanelInsetStrength", label: "Drawer panel inset", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerPanelGlowOpacity", label: "Drawer panel glow", min: 0, max: 0.8, step: 0.01 },
];

export const MATERIAL_CONTROL_ITEMS: DesignControlItem[] = [
  { key: "matBgPinkOpacity", label: "Фон слева (розовый) / BG left pink", min: 0, max: 0.5, step: 0.01 },
  { key: "matBgBlueOpacity", label: "Фон справа сверху (синий) / BG top-right blue", min: 0, max: 0.5, step: 0.01 },
  { key: "matBgMintOpacity", label: "Фон снизу (мятный) / BG bottom mint", min: 0, max: 0.4, step: 0.01 },
  { key: "sceneDimOpacity", label: "Общее затемнение сцены / Scene dim", min: 0, max: 0.8, step: 0.01 },
  { key: "matCardBorderOpacity", label: "Card border opacity", min: 0, max: 0.6, step: 0.01 },
  { key: "matCardShadowStrength", label: "Card shadow strength", min: 0, max: 0.8, step: 0.01 },
  { key: "matCardInsetStrength", label: "Card inset strength", min: 0, max: 0.6, step: 0.01 },
  { key: "matTopbarBorderOpacity", label: "Topbar border opacity", min: 0, max: 0.6, step: 0.01 },
  { key: "topbarGlowOpacity", label: "Topbar glow opacity", min: 0, max: 0.5, step: 0.01 },
  { key: "topbarBgOpacity", label: "Topbar background opacity", min: 0.5, max: 1, step: 0.01 },
  { key: "matActiveGlowStrength", label: "Active tab glow", min: 0, max: 0.6, step: 0.01 },
  { key: "matButtonGlowStrength", label: "Button glow", min: 0, max: 0.6, step: 0.01 },
  { key: "matBadgeGlowStrength", label: "Badge glow", min: 0, max: 0.6, step: 0.01 },
  { key: "matRowHoverStrength", label: "Table hover strength", min: 0, max: 0.6, step: 0.01 },
  { key: "matScrollbarGlowStrength", label: "Scrollbar glow", min: 0, max: 1, step: 0.01 },
];

export const DRAWER_CONTROL_ITEMS: DesignControlItem[] = [
  { key: "drawerWidth", label: "Width", min: 360, max: 760, step: 1 },
  { key: "drawerPadding", label: "Padding", min: 8, max: 36, step: 1 },
  { key: "drawerTitleSize", label: "Title size", min: 14, max: 30, step: 1 },
  { key: "drawerMetaGap", label: "Meta gap", min: 2, max: 24, step: 1 },
  { key: "drawerSectionGap", label: "Section gap", min: 6, max: 28, step: 1 },
  { key: "drawerMiniDatesFontSize", label: "Dates font", min: 9, max: 16, step: 1 },
  { key: "drawerMilestoneDateFontSize", label: "Milestone date font", min: 9, max: 16, step: 1 },
  { key: "drawerMilestoneRowGap", label: "Milestone row gap", min: 2, max: 20, step: 1 },
  { key: "drawerCalendarCellHeight", label: "Calendar cell height", min: 34, max: 90, step: 1 },
  { key: "drawerCalendarDayFontSize", label: "Calendar day font", min: 9, max: 18, step: 1 },
  { key: "drawerCalendarRadius", label: "Calendar radius", min: 2, max: 18, step: 1 },
  { key: "drawerCalendarMonthTintOpacity", label: "Month tint", min: 0, max: 0.5, step: 0.01 },
  { key: "drawerCalendarWeekendTintOpacity", label: "Weekend tint", min: 0, max: 0.5, step: 0.01 },
  { key: "drawerCalendarHolidayTintOpacity", label: "Holiday tint", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerMilestoneCellGlowOpacity", label: "Cell glow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellShadowOpacity", label: "Cell inset shadow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneDotSize", label: "Dot size", min: 2, max: 16, step: 1 },
  { key: "drawerMilestoneLabelFontSize", label: "Label font", min: 8, max: 16, step: 1 },
  { key: "drawerMilestoneLabelMaxWidth", label: "Label width", min: 30, max: 130, step: 1 },
  { key: "drawerMonthLabelFontSize", label: "Month label font", min: 8, max: 14, step: 1 },
  { key: "drawerMilestoneDayShadowOpacity", label: "Day shadow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellDarkShadowOpacity", label: "Cell dark shadow", min: 0, max: 1, step: 0.01 },
  { key: "drawerMilestoneCellDarkShadowBlur", label: "Cell dark blur", min: 0, max: 80, step: 1 },
  { key: "drawerPanelBorderOpacity", label: "Panel border", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerPanelShadowStrength", label: "Panel shadow", min: 0, max: 0.8, step: 0.01 },
  { key: "drawerPanelInsetStrength", label: "Panel inset", min: 0, max: 0.6, step: 0.01 },
  { key: "drawerPanelGlowOpacity", label: "Panel glow", min: 0, max: 0.8, step: 0.01 },
];

export const ALL_DESIGN_CONTROL_ITEMS: DesignControlItem[] = [
  ...DESIGN_CONTROL_ITEMS,
  ...MATERIAL_CONTROL_ITEMS,
];

export function normalizeDesignControls(input: Partial<DesignControls>): DesignControls {
  const maybeLegacy = input as Partial<DesignControls> & {
    timelinePerfMinMonthPxDetailed?: number;
    timelinePerfMinWeekPxDetailed?: number;
  };
  const normalizedWeekPxX10 =
    maybeLegacy.timelinePerfMinWeekPxDetailedX10 ??
    (typeof maybeLegacy.timelinePerfMinWeekPxDetailed === "number"
      ? Math.round(maybeLegacy.timelinePerfMinWeekPxDetailed / 10)
      : undefined) ??
    (typeof maybeLegacy.timelinePerfMinMonthPxDetailed === "number"
      ? Math.round((maybeLegacy.timelinePerfMinMonthPxDetailed * 7) / 30.44 / 10)
      : undefined);

  const merged = {
    ...DEFAULT_DESIGN_CONTROLS,
    ...input,
    ...(typeof normalizedWeekPxX10 === "number"
      ? { timelinePerfMinWeekPxDetailedX10: normalizedWeekPxX10 }
      : {}),
  };

  return {
    ...merged,
    animEnabled: Math.round(Math.max(0, Math.min(1, merged.animEnabled))),
    animDrawerDurationMs: Math.max(0, Math.min(700, merged.animDrawerDurationMs)),
    animDrawerEasePreset: Math.round(Math.max(0, Math.min(4, merged.animDrawerEasePreset))),
    animReorderDurationMs: Math.max(0, Math.min(1000, merged.animReorderDurationMs)),
    animReorderEasePreset: Math.round(Math.max(0, Math.min(4, merged.animReorderEasePreset))),
    animReorderStaggerMs: Math.max(0, Math.min(20, merged.animReorderStaggerMs)),
    animReorderStaggerCapMs: Math.max(0, Math.min(200, merged.animReorderStaggerCapMs)),
    animReorderDistanceFactor: Math.max(0, Math.min(1, merged.animReorderDistanceFactor)),
    animReorderDistanceMaxExtraMs: Math.max(0, Math.min(400, merged.animReorderDistanceMaxExtraMs)),
    animReorderViewportOnly: Math.round(Math.max(0, Math.min(1, merged.animReorderViewportOnly))),
    animReorderViewportBufferPx: Math.max(0, Math.min(500, merged.animReorderViewportBufferPx)),
    animReorderAutoDisableRows: Math.max(1, Math.min(1000, Math.round(merged.animReorderAutoDisableRows))),
    designersCardTintStrength: Math.max(0, Math.min(0.8, merged.designersCardTintStrength)),
    timelineModeDockOffsetX: Math.max(-500, Math.min(500, Math.round(merged.timelineModeDockOffsetX))),
    timelineModeDockOffsetY: Math.max(-240, Math.min(240, Math.round(merged.timelineModeDockOffsetY))),
    timelineModeDockScale: Math.max(0.6, Math.min(2, merged.timelineModeDockScale)),
    timelineTopControlDockOffsetX: Math.max(-500, Math.min(500, Math.round(merged.timelineTopControlDockOffsetX))),
    timelineTopControlDockOffsetY: Math.max(-240, Math.min(240, Math.round(merged.timelineTopControlDockOffsetY))),
    drawerCalendarCellHeight: Math.max(34, Math.min(62, merged.drawerCalendarCellHeight)),
  };
}

export async function loadPublicDesignControls(): Promise<DesignControls> {
  try {
    const res = await fetch(DESIGN_CONTROLS_PUBLIC_PATH, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const parsed = (await res.json()) as Partial<DesignControls>;
      return normalizeDesignControls(parsed);
    }
  } catch {
    // optional runtime preset file
  }

  return DEFAULT_DESIGN_CONTROLS;
}
