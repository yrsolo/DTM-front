import type { DesignControls } from "./controls";
import { ALL_DESIGN_CONTROL_ITEMS } from "./controls";
import type { KeyColors } from "./colors";
import { KEY_COLOR_ITEMS, TASK_PALETTE_ITEMS } from "./colors";

export type WorkbenchTabId =
  | "foundation"
  | "surfaces"
  | "timeline"
  | "tasksTable"
  | "drawer"
  | "milestones"
  | "motion"
  | "workbench"
  | "defaults";

export type LegacyWorkbenchTabId =
  | "defaults"
  | "material"
  | "buttons"
  | "panels"
  | "panelGuide"
  | "animation"
  | "tasksPage"
  | "timeline"
  | "milestones"
  | "leftPanel"
  | "drawer"
  | "colors"
  | "palette"
  | "workbench";

export type WorkbenchControlRef =
  | { kind: "range"; key: keyof DesignControls }
  | { kind: "color"; key: keyof KeyColors };

export type WorkbenchGroupConfig = {
  title: string;
  controls: WorkbenchControlRef[];
};

export type WorkbenchSectionConfig = {
  id: WorkbenchTabId;
  title: string;
  groups: WorkbenchGroupConfig[];
};

export type WorkbenchValidationIssue = {
  severity: "error" | "warn";
  code: string;
  message: string;
};

const range = (key: keyof DesignControls): WorkbenchControlRef => ({ kind: "range", key });
const color = (key: keyof KeyColors): WorkbenchControlRef => ({ kind: "color", key });

export const WORKBENCH_DUPLICATE_ALLOWLIST = {
  range: [] as Array<keyof DesignControls>,
  color: [] as Array<keyof KeyColors>,
};

export const WORKBENCH_LEGACY_TAB_MAP: Record<LegacyWorkbenchTabId, WorkbenchTabId> = {
  defaults: "defaults",
  material: "foundation",
  buttons: "foundation",
  panels: "surfaces",
  panelGuide: "surfaces",
  animation: "motion",
  tasksPage: "tasksTable",
  timeline: "timeline",
  milestones: "milestones",
  leftPanel: "tasksTable",
  drawer: "drawer",
  colors: "foundation",
  palette: "foundation",
  workbench: "workbench",
};

export const WORKBENCH_LAYOUT: WorkbenchSectionConfig[] = [
  {
    id: "foundation",
    title: "Основа / Foundation",
    groups: [
      {
        title: "Основа | Фон сцены / Foundation | Scene background",
        controls: [color("keyAppBgBase"), color("keyAppBgTop"), color("keyAppBgMid"), color("keyAppBgBottom"), range("sceneDimOpacity")],
      },
      {
        title: "Основа | Атмосфера сцены / Foundation | Scene atmosphere",
        controls: [
          range("matBgPinkOpacity"),
          range("matBgBlueOpacity"),
          range("matBgMintOpacity"),
          color("keyBackdropLeft"),
          color("keyBackdropRight"),
          color("keyBackdropBottom"),
        ],
      },
      {
        title: "Основа | Базовые акценты / Foundation | Core accents",
        controls: [color("keyPink"), color("keyBlue"), color("keyMint"), color("keyViolet"), color("keyText"), color("keyCursorTrail")],
      },
      {
        title: "Основа | Кнопки / Foundation | Buttons",
        controls: [
          range("matButtonGlowStrength"),
          range("matActiveGlowStrength"),
          color("keyBtnGradFrom"),
          color("keyBtnGradTo"),
          color("keyBtnHoverFrom"),
          color("keyBtnHoverTo"),
        ],
      },
      {
        title: "Основа | Навигация и бейджи / Foundation | Navigation and badges",
        controls: [
          range("matBadgeGlowStrength"),
          color("keyNavBtnFrom"),
          color("keyNavBtnTo"),
          color("keyNavActiveFrom"),
          color("keyNavActiveTo"),
          color("keyTopbarGlow"),
        ],
      },
      {
        title: "Основа | Палитра задач A / Foundation | Task palette A",
        controls: [color("taskColor1"), color("taskColor2"), color("taskColor3"), color("taskColor4")],
      },
      {
        title: "Основа | Палитра задач B / Foundation | Task palette B",
        controls: [color("taskColor5"), color("taskColor6"), color("taskColor7"), color("taskColor8")],
      },
    ],
  },
  {
    id: "surfaces",
    title: "Поверхности / Surfaces",
    groups: [
      {
        title: "Поверхности | Карточки и хром / Surfaces | Cards and chrome",
        controls: [
          range("matCardBorderOpacity"),
          range("matCardShadowStrength"),
          range("matCardInsetStrength"),
          range("cardPadding"),
          range("matTopbarBorderOpacity"),
          range("topbarBgOpacity"),
        ],
      },
      {
        title: "Поверхности | Таблица и отклик / Surfaces | Table and feedback",
        controls: [
          range("matRowHoverStrength"),
          range("matScrollbarGlowStrength"),
          range("topbarGlowOpacity"),
          color("keySurfaceTop"),
          color("keySurfaceBottom"),
          color("keySurfaceAlt"),
        ],
      },
      {
        title: "Поверхности | Карточки дизайнеров / Surfaces | Designers cards",
        controls: [range("designersCardTintStrength")],
      },
    ],
  },
  {
    id: "timeline",
    title: "Таймлайн / Timeline",
    groups: [
      {
        title: "Таймлайн | Геометрия / Timeline | Geometry",
        controls: [range("timelineWidth"), range("timelineMinHeight"), range("timelineTopOffset"), range("timelineLabelWidth"), range("barInsetY"), range("barRadius")],
      },
      {
        title: "Таймлайн | Сетка и подписи / Timeline | Grid and labels",
        controls: [
          range("timelineGridOpacity"),
          range("timelineGridLineWidth"),
          range("timelineStripeOpacity"),
          range("timelineLabelEveryDay"),
          range("timelineDateLabelY"),
          range("timelineDateFontSize"),
        ],
      },
      {
        title: "Таймлайн | Даты и месяцы / Timeline | Dates and months",
        controls: [
          range("timelineDateIdleOpacity"),
          range("timelineDateHoverOpacity"),
          range("timelineMonthFontSize"),
          range("timelineMonthOffsetY"),
          range("timelineMonthOffsetX"),
          range("timelineTodayLineOpacity"),
        ],
      },
      {
        title: "Таймлайн | Курсор и календарь / Timeline | Cursor and calendar",
        controls: [
          range("timelineTodayLineWidth"),
          range("timelineCursorTrailDays"),
          range("timelineCursorTrailOpacity"),
          range("timelineHolidayFillOpacity"),
          range("timelineWeekendFillOpacity"),
          range("timelineWeekendFullDay"),
        ],
      },
      {
        title: "Таймлайн | Dock-панели / Timeline | Dock panels",
        controls: [
          range("timelineModeDockOffsetX"),
          range("timelineModeDockOffsetY"),
          range("timelineModeDockScale"),
          range("timelineTopControlDockOffsetX"),
          range("timelineTopControlDockOffsetY"),
        ],
      },
      {
        title: "Таймлайн | Поведение и оптимизация / Timeline | Behavior and optimization",
        controls: [
          range("tooltipOffsetX"),
          range("tooltipOffsetY"),
          range("tooltipBubbleScale"),
          range("textRenderingMode"),
          range("textSmoothingMode"),
          range("timelinePerfMinWeekPxDetailedX10"),
        ],
      },
    ],
  },
  {
    id: "tasksTable",
    title: "Таблица задач / Tasks Table",
    groups: [
      {
        title: "Таблица задач | Геометрия / Tasks Table | Geometry",
        controls: [
          range("desktopLeftColWidth"),
          range("tableRowHeight"),
          range("tableCellPadX"),
          range("tableCellPadY"),
          range("tasksTitleCol"),
          range("tasksStatusCol"),
        ],
      },
      {
        title: "Таблица задач | Колонки и бейджи / Tasks Table | Columns and badges",
        controls: [
          range("designersNameCol"),
          range("designersTasksCol"),
          range("designersLoadCol"),
          range("badgeHeight"),
          range("badgeFontSize"),
          color("keyLeftPillText"),
        ],
      },
      {
        title: "Таблица задач | Исполнитель и мета / Tasks Table | Owner and meta",
        controls: [
          range("timelineLeftOwnerFontSize"),
          range("timelineLeftOwnerXOffset"),
          range("timelineLeftOwnerTextOffsetY"),
          range("timelineLeftOwnerCropLeft"),
          range("timelineLeftMetaFontSize"),
          range("timelineLeftMetaTextOffsetY"),
        ],
      },
      {
        title: "Таблица задач | Задача и группа / Tasks Table | Task and group",
        controls: [
          range("timelineLeftTaskFontSize"),
          range("timelineLeftTaskXOffset"),
          range("timelineLeftTaskTextOffsetY"),
          range("timelineLeftTaskCropLeft"),
          range("timelineLeftGroupFontSize"),
          range("timelineLeftGroupCropLeft"),
        ],
      },
      {
        title: "Таблица задач | Пилюля и выравнивание / Tasks Table | Pill and alignment",
        controls: [
          range("timelineLeftPillWidth"),
          range("timelineLeftPillSizeScale"),
          range("timelineLeftPillXOffset"),
          range("timelineLeftPillOffsetY"),
          range("timelineLeftGroupXOffset"),
          range("timelineLeftGroupOffsetY"),
        ],
      },
    ],
  },
  {
    id: "drawer",
    title: "Карточка / Drawer",
    groups: [
      {
        title: "Карточка | Контейнер / Drawer | Container",
        controls: [
          range("drawerWidth"),
          range("drawerPadding"),
          range("drawerSectionGap"),
          range("drawerTitleSize"),
          range("drawerMetaGap"),
          range("drawerMiniDatesFontSize"),
        ],
      },
      {
        title: "Карточка | Календарь / Drawer | Calendar",
        controls: [
          range("drawerCalendarCellHeight"),
          range("drawerCalendarDayFontSize"),
          range("drawerCalendarRadius"),
          range("drawerMonthLabelFontSize"),
          range("drawerCalendarMonthTintOpacity"),
          range("drawerCalendarWeekendTintOpacity"),
        ],
      },
      {
        title: "Карточка | Акценты календаря / Drawer | Calendar accents",
        controls: [range("drawerCalendarHolidayTintOpacity")],
      },
      {
        title: "Карточка | Панель / Drawer | Panel",
        controls: [
          range("drawerPanelBorderOpacity"),
          range("drawerPanelShadowStrength"),
          range("drawerPanelInsetStrength"),
          range("drawerPanelGlowOpacity"),
          color("keyDrawerSurfaceTop"),
          color("keyDrawerSurfaceBottom"),
        ],
      },
      {
        title: "Карточка | Поверхность и глоу / Drawer | Surface and glow",
        controls: [color("keyDrawerSurfaceAlt"), color("keyDrawerPanelGlowLeft"), color("keyDrawerPanelGlowRight"), color("keyDrawerPanelGlowBottom")],
      },
    ],
  },
  {
    id: "milestones",
    title: "Майлстоуны / Milestones",
    groups: [
      {
        title: "Майлстоуны | Таймлайн / Milestones | Timeline",
        controls: [range("timelineShowMilestoneLabels"), range("milestoneSizeScale"), range("milestoneOpacity"), range("taskColorMixPercent"), color("keyMilestone")],
      },
      {
        title: "Майлстоуны | Список в карточке / Milestones | Drawer list",
        controls: [
          range("drawerMilestoneDateFontSize"),
          range("drawerMilestoneRowGap"),
          range("drawerMilestoneLabelFontSize"),
          range("drawerMilestoneLabelMaxWidth"),
          range("drawerMilestoneDotSize"),
          range("drawerMilestoneDayShadowOpacity"),
        ],
      },
      {
        title: "Майлстоуны | Ячейки в карточке / Milestones | Drawer cells",
        controls: [
          range("drawerMilestoneCellGlowOpacity"),
          range("drawerMilestoneCellShadowOpacity"),
          range("drawerMilestoneCellDarkShadowOpacity"),
          range("drawerMilestoneCellDarkShadowBlur"),
        ],
      },
      {
        title: "Майлстоуны | Цвета типов A / Milestones | Type colors A",
        controls: [
          color("keyDrawerMsStoryboard"),
          color("keyDrawerMsAnimatic"),
          color("keyDrawerMsFeedback"),
          color("keyDrawerMsPrefinal"),
          color("keyDrawerMsFinal"),
          color("keyDrawerMsMaster"),
        ],
      },
      {
        title: "Майлстоуны | Цвета типов B / Milestones | Type colors B",
        controls: [color("keyDrawerMsOnair"), color("keyDrawerMsStart"), color("keyDrawerMsDefault")],
      },
    ],
  },
  {
    id: "motion",
    title: "Движение / Motion",
    groups: [
      {
        title: "Движение | База / Motion | Base",
        controls: [
          range("animEnabled"),
          range("animDrawerDurationMs"),
          range("animDrawerEasePreset"),
          range("animReorderDurationMs"),
          range("animReorderEasePreset"),
          range("animReorderStaggerMs"),
        ],
      },
      {
        title: "Движение | Reorder / Motion | Reorder",
        controls: [
          range("animReorderStaggerCapMs"),
          range("animReorderDistanceFactor"),
          range("animReorderDistanceMaxExtraMs"),
          range("animReorderViewportOnly"),
          range("animReorderViewportBufferPx"),
          range("animReorderAutoDisableRows"),
        ],
      },
    ],
  },
  {
    id: "workbench",
    title: "Крутилки / Workbench",
    groups: [
      {
        title: "Крутилки | Dock / Workbench | Dock",
        controls: [
          range("workbenchDockLeft"),
          range("workbenchDockRight"),
          range("workbenchDockBottom"),
          range("workbenchWidthMax"),
          range("workbenchViewportMargin"),
          range("workbenchBodyMaxHeightVh"),
        ],
      },
      {
        title: "Крутилки | Layout / Workbench | Layout",
        controls: [
          range("workbenchBodyPadding"),
          range("workbenchMainGap"),
          range("workbenchTabsGap"),
          range("workbenchSideWidth"),
          range("workbenchGridMinCol"),
          range("workbenchGridGap"),
        ],
      },
      {
        title: "Крутилки | Навигация и группы / Workbench | Navigation and groups",
        controls: [
          range("workbenchGroupPadding"),
          range("workbenchControlGap"),
          range("workbenchTabFontSize"),
          range("workbenchTabPadY"),
          range("workbenchTabPadX"),
          range("workbenchLabelMinWidth"),
        ],
      },
      {
        title: "Крутилки | Контролы / Workbench | Controls",
        controls: [
          range("workbenchSliderWidth"),
          range("workbenchNumberWidth"),
          range("workbenchColorTextWidth"),
          range("workbenchControlLabelFontSize"),
          range("workbenchControlInputFontSize"),
          range("workbenchActionBtnFontSize"),
        ],
      },
      {
        title: "Крутилки | Кнопки действий / Workbench | Action buttons",
        controls: [range("workbenchActionBtnPadY"), range("workbenchActionBtnPadX")],
      },
    ],
  },
  {
    id: "defaults",
    title: "Сеанс / Defaults",
    groups: [],
  },
];

function isIllegalGroupTitle(title: string): boolean {
  return /\bOther\b|\bMisc\b|\(2\)|\bПрочее\b/i.test(title);
}

function collectKnownRangeKeys(): Set<string> {
  return new Set(ALL_DESIGN_CONTROL_ITEMS.map((item) => String(item.key)));
}

function collectKnownColorKeys(): Set<string> {
  return new Set([...KEY_COLOR_ITEMS, ...TASK_PALETTE_ITEMS].map((item) => String(item.key)));
}

export function resolveWorkbenchTabId(raw: string | null | undefined): WorkbenchTabId {
  if (!raw) return WORKBENCH_LAYOUT[0]?.id ?? "foundation";
  const normalized = raw.trim() as WorkbenchTabId | LegacyWorkbenchTabId;
  const direct = WORKBENCH_LAYOUT.find((section) => section.id === normalized);
  if (direct) return direct.id;
  if (normalized in WORKBENCH_LEGACY_TAB_MAP) {
    return WORKBENCH_LEGACY_TAB_MAP[normalized as LegacyWorkbenchTabId];
  }
  return WORKBENCH_LAYOUT[0]?.id ?? "foundation";
}

export function validateWorkbenchLayout(): WorkbenchValidationIssue[] {
  const issues: WorkbenchValidationIssue[] = [];
  const knownRange = collectKnownRangeKeys();
  const knownColor = collectKnownColorKeys();
  const rangeCounts = new Map<string, number>();
  const colorCounts = new Map<string, number>();

  for (const section of WORKBENCH_LAYOUT) {
    if (section.id !== "defaults" && section.groups.length === 0) {
      issues.push({ severity: "warn", code: "empty-section", message: `Section '${section.id}' has no groups.` });
    }
    for (const group of section.groups) {
      if (group.controls.length === 0) {
        issues.push({ severity: "warn", code: "empty-group", message: `Group '${group.title}' in '${section.id}' is empty.` });
      }
      if (group.controls.length > 6) {
        issues.push({ severity: "warn", code: "group-too-wide", message: `Group '${group.title}' in '${section.id}' has more than 6 controls.` });
      }
      if (isIllegalGroupTitle(group.title)) {
        issues.push({ severity: "error", code: "illegal-group-title", message: `Group '${group.title}' in '${section.id}' uses a banned placeholder title.` });
      }
      for (const control of group.controls) {
        const key = String(control.key);
        if (control.kind === "range") {
          if (!knownRange.has(key)) {
            issues.push({ severity: "error", code: "unknown-range", message: `Unknown range key '${key}' in '${group.title}'.` });
          }
          rangeCounts.set(key, (rangeCounts.get(key) ?? 0) + 1);
        } else {
          if (!knownColor.has(key)) {
            issues.push({ severity: "error", code: "unknown-color", message: `Unknown color key '${key}' in '${group.title}'.` });
          }
          colorCounts.set(key, (colorCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  for (const key of knownRange) {
    const count = rangeCounts.get(key) ?? 0;
    if (count === 0) {
      issues.push({ severity: "error", code: "unassigned-range", message: `Range key '${key}' is not assigned to any workbench group.` });
    } else if (count > 1 && !WORKBENCH_DUPLICATE_ALLOWLIST.range.includes(key as keyof DesignControls)) {
      issues.push({ severity: "error", code: "duplicate-range", message: `Range key '${key}' appears ${count} times outside the duplicate allowlist.` });
    }
  }

  for (const key of knownColor) {
    const count = colorCounts.get(key) ?? 0;
    if (count === 0) {
      issues.push({ severity: "error", code: "unassigned-color", message: `Color key '${key}' is not assigned to any workbench group.` });
    } else if (count > 1 && !WORKBENCH_DUPLICATE_ALLOWLIST.color.includes(key as keyof KeyColors)) {
      issues.push({ severity: "error", code: "duplicate-color", message: `Color key '${key}' appears ${count} times outside the duplicate allowlist.` });
    }
  }

  return issues;
}
