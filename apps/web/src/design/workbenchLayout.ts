import type { DesignControls } from "./controls";
import type { KeyColors } from "./colors";

export type WorkbenchTabId =
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

const range = (key: keyof DesignControls): WorkbenchControlRef => ({ kind: "range", key });
const color = (key: keyof KeyColors): WorkbenchControlRef => ({ kind: "color", key });

export const WORKBENCH_LAYOUT: WorkbenchSectionConfig[] = [
  {
    id: "defaults",
    title: "По умолчанию / Defaults",
    groups: [],
  },
  {
    id: "material",
    title: "Материал / Material",
    groups: [
      {
        title: "Сцена | Интенсивность и затемнение / Scene | Intensity and dimming",
        controls: [range("sceneDimOpacity"), range("matBgPinkOpacity"), range("matBgBlueOpacity"), range("matBgMintOpacity")],
      },
      {
        title: "Сцена | Глоу по краям / Scene | Edge glows",
        controls: [
          color("keyBackdropLeft"),
          color("keyBackdropRight"),
          color("keyBackdropBottom"),
          color("keyAppBgTop"),
          color("keyAppBgMid"),
          color("keyAppBgBottom"),
        ],
      },
      {
        title: "Сцена | База фона / Scene | Base background",
        controls: [color("keyAppBgBase"), color("keySurfaceTop"), color("keySurfaceBottom"), color("keySurfaceAlt")],
      },
    ],
  },
  {
    id: "buttons",
    title: "Кнопки / Buttons",
    groups: [
      {
        title: "Кнопки | Подсветки / Buttons | Highlights",
        controls: [
          range("matButtonGlowStrength"),
          range("matActiveGlowStrength"),
          range("matBadgeGlowStrength"),
        ],
      },
      {
        title: "Кнопки | Градиент / Buttons | Gradient",
        controls: [
          color("keyBtnGradFrom"),
          color("keyBtnGradTo"),
          color("keyBtnHoverFrom"),
          color("keyBtnHoverTo"),
        ],
      },
      {
        title: "Кнопки | Навигация / Buttons | Navigation",
        controls: [
          color("keyNavBtnFrom"),
          color("keyNavBtnTo"),
          color("keyNavActiveFrom"),
          color("keyNavActiveTo"),
          color("keyText"),
          color("keyLeftPillText"),
        ],
      },
    ],
  },
  {
    id: "panels",
    title: "Панели / Panels",
    groups: [
      {
        title: "Панели | Общие карточки / Panels | Global cards",
        controls: [
          range("matCardBorderOpacity"),
          range("matCardShadowStrength"),
          range("matCardInsetStrength"),
          range("matTopbarBorderOpacity"),
          range("topbarGlowOpacity"),
          range("topbarBgOpacity"),
        ],
      },
      {
        title: "Панели | Общие карточки (2) / Panels | Global cards (2)",
        controls: [
          range("matRowHoverStrength"),
          color("keyTopbarGlow"),
        ],
      },
      {
        title: "Панели | Карточка задачи / Panels | Task drawer",
        controls: [
          range("drawerPanelBorderOpacity"),
          range("drawerPanelShadowStrength"),
          range("drawerPanelInsetStrength"),
          range("drawerPanelGlowOpacity"),
          range("drawerSectionGap"),
          range("drawerPadding"),
          range("drawerWidth"),
        ],
      },
      {
        title: "Панели | Глоу карточки / Panels | Drawer glow colors",
        controls: [
          color("keyDrawerPanelGlowLeft"),
          color("keyDrawerPanelGlowRight"),
          color("keyDrawerPanelGlowBottom"),
        ],
      },
      {
        title: "Панели | Внутри таблицы / Panels | Table inner colors",
        controls: [color("keySurfaceTop"), color("keySurfaceBottom"), color("keySurfaceAlt")],
      },
      {
        title: "Панели | Внутри карточки / Panels | Drawer inner colors",
        controls: [color("keyDrawerSurfaceTop"), color("keyDrawerSurfaceBottom"), color("keyDrawerSurfaceAlt")],
      },
      {
        title: "Панели | Страница дизайнеров / Panels | Designers page",
        controls: [range("designersCardTintStrength")],
      },
    ],
  },
  {
    id: "panelGuide",
    title: "Схема панелей / Panel map",
    groups: [],
  },
  {
    id: "timeline",
    title: "Таймлайн / Timeline",
    groups: [
      {
        title: "Таймлайн | Размеры / Timeline | Dimensions",
        controls: [
          range("timelineWidth"),
          range("timelineMinHeight"),
          range("timelineTopOffset"),
          range("timelineLabelWidth"),
          range("cardPadding"),
          range("barRadius"),
        ],
      },
      {
        title: "Таймлайн | Сетка / Timeline | Grid",
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
        title: "Таймлайн | Курсор и сегодня / Timeline | Cursor and today",
        controls: [
          range("timelineTodayLineWidth"),
          range("timelineCursorTrailDays"),
          range("timelineCursorTrailOpacity"),
          color("keyCursorTrail"),
          range("timelineHolidayFillOpacity"),
          range("timelineWeekendFillOpacity"),
        ],
      },
      {
        title: "Дизайн | Оптимизация / Design | Optimization",
        controls: [
          range("timelineWeekendFullDay"),
          range("timelinePerfMinWeekPxDetailedX10"),
          range("tooltipOffsetX"),
          range("tooltipOffsetY"),
          range("tooltipBubbleScale"),
        ],
      },
      {
        title: "Таймлайн | Прочее / Timeline | Other",
        controls: [
          range("textRenderingMode"),
          range("textSmoothingMode"),
          range("barInsetY"),
        ],
      },
      {
        title: "Таймлайн | Позиция панелей / Timeline | Dock panels position",
        controls: [
          range("timelineModeDockOffsetX"),
          range("timelineModeDockOffsetY"),
          range("timelineModeDockScale"),
          range("timelineTopControlDockOffsetX"),
          range("timelineTopControlDockOffsetY"),
        ],
      },
      {
        title: "Таймлайн | Акценты / Timeline | Accents",
        controls: [color("keyMint"), color("keyViolet")],
      },
    ],
  },
  {
    id: "tasksPage",
    title: "Задачи / Tasks page",
    groups: [
      {
        title: "Задачи | Основное / Tasks | Main",
        controls: [
          range("timelineWidth"),
          range("timelineMinHeight"),
          range("timelineTopOffset"),
          range("timelineLabelWidth"),
          range("tableRowHeight"),
          range("desktopLeftColWidth"),
        ],
      },
      {
        title: "Задачи | Шапка и сетка / Tasks | Header and grid",
        controls: [
          range("timelineDateLabelY"),
          range("timelineDateFontSize"),
          range("timelineMonthFontSize"),
          range("timelineGridOpacity"),
          range("timelineGridLineWidth"),
          range("timelineStripeOpacity"),
        ],
      },
      {
        title: "Задачи | Левый блок / Tasks | Left panel",
        controls: [
          range("timelineLeftOwnerFontSize"),
          range("timelineLeftTaskFontSize"),
          range("timelineLeftMetaFontSize"),
          range("timelineLeftPillWidth"),
          range("timelineLeftPillSizeScale"),
          range("timelineLeftGroupFontSize"),
        ],
      },
      {
        title: "Задачи | Позиция / Tasks | Positioning",
        controls: [
          range("timelineModeDockOffsetX"),
          range("timelineModeDockOffsetY"),
          range("timelineModeDockScale"),
          range("timelineTopControlDockOffsetX"),
          range("timelineTopControlDockOffsetY"),
          range("cardPadding"),
        ],
      },
    ],
  },
  {
    id: "animation",
    title: "Анимация / Animation",
    groups: [
      {
        title: "Анимация | База / Animation | Base",
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
        title: "Анимация | Reorder / Animation | Reorder",
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
    id: "milestones",
    title: "Майлстоуны / Milestones",
    groups: [
      {
        title: "Майлстоуны | Таймлайн / Milestones | Timeline",
        controls: [
          range("timelineShowMilestoneLabels"),
          range("milestoneSizeScale"),
          range("milestoneOpacity"),
          range("taskColorMixPercent"),
          color("keyMilestone"),
          color("keyPink"),
        ],
      },
      {
        title: "Майлстоуны | Карточка список / Milestones | Drawer list",
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
        title: "Майлстоуны | Карточка ячейки / Milestones | Drawer cells",
        controls: [
          range("drawerMilestoneCellGlowOpacity"),
          range("drawerMilestoneCellShadowOpacity"),
          range("drawerMilestoneCellDarkShadowOpacity"),
          range("drawerMilestoneCellDarkShadowBlur"),
          color("keyDrawerMsStoryboard"),
          color("keyDrawerMsAnimatic"),
        ],
      },
      {
        title: "Майлстоуны | Цвета типов / Milestones | Type colors",
        controls: [
          color("keyDrawerMsFeedback"),
          color("keyDrawerMsPrefinal"),
          color("keyDrawerMsFinal"),
          color("keyDrawerMsMaster"),
          color("keyDrawerMsOnair"),
          color("keyDrawerMsStart"),
        ],
      },
      {
        title: "Майлстоуны | Прочее / Milestones | Other",
        controls: [color("keyDrawerMsDefault")],
      },
    ],
  },
  {
    id: "leftPanel",
    title: "Левый блок / Left panel",
    groups: [
      {
        title: "Левый блок | Таблица / Left panel | Table",
        controls: [
          range("desktopLeftColWidth"),
          range("tableRowHeight"),
          range("tableCellPadX"),
          range("tableCellPadY"),
          range("designersNameCol"),
          range("designersTasksCol"),
        ],
      },
      {
        title: "Левый блок | Колонки и бейдж / Left panel | Columns and badge",
        controls: [
          range("designersLoadCol"),
          range("badgeHeight"),
          range("badgeFontSize"),
          range("tasksTitleCol"),
          range("tasksStatusCol"),
          range("timelineLeftPillWidth"),
        ],
      },
      {
        title: "Левый блок | Дизайнер / Left panel | Designer text",
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
        title: "Левый блок | Задача / Left panel | Task text",
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
        title: "Левый блок | Позиции / Left panel | Positioning",
        controls: [
          range("timelineLeftPillXOffset"),
          range("timelineLeftPillOffsetY"),
          range("timelineLeftPillSizeScale"),
          range("timelineLeftGroupXOffset"),
          range("timelineLeftGroupOffsetY"),
          color("keyLeftPillText"),
        ],
      },
    ],
  },
  {
    id: "drawer",
    title: "Карточка задачи / Task drawer",
    groups: [
      {
        title: "Карточка | Основа / Drawer | Base",
        controls: [
          range("drawerTitleSize"),
          range("drawerMetaGap"),
          range("drawerMiniDatesFontSize"),
        ],
      },
      {
        title: "Карточка | Календарь сетка / Drawer | Calendar grid",
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
        title: "Карточка | Календарь акценты / Drawer | Calendar accents",
        controls: [
          range("drawerCalendarHolidayTintOpacity"),
          color("keyText"),
        ],
      },
    ],
  },
  {
    id: "colors",
    title: "Цвета / Colors",
    groups: [
      {
        title: "Цвета | База / Colors | Base",
        controls: [color("keyPink"), color("keyBlue"), color("keyMint"), color("keyViolet"), color("keyText"), color("keyCursorTrail")],
      },
      {
        title: "Цвета | Поверхности / Colors | Surfaces",
        controls: [
          color("keySurfaceTop"),
          color("keySurfaceBottom"),
          color("keySurfaceAlt"),
          color("keyDrawerSurfaceTop"),
          color("keyDrawerSurfaceBottom"),
          color("keyDrawerSurfaceAlt"),
        ],
      },
      {
        title: "Цвета | Фон сцены / Colors | Scene background",
        controls: [
          color("keyAppBgTop"),
          color("keyAppBgMid"),
          color("keyAppBgBottom"),
        ],
      },
      {
        title: "Цвета | Подложка / Colors | Backdrop",
        controls: [
          color("keyAppBgBase"),
          color("keyBackdropLeft"),
          color("keyBackdropRight"),
          color("keyBackdropBottom"),
          color("keyCursorTrail"),
          color("keyText"),
        ],
      },
    ],
  },
  {
    id: "palette",
    title: "Палитра задач / Task palette",
    groups: [
      {
        title: "Палитра задач | Набор A / Task palette | Set A",
        controls: [color("taskColor1"), color("taskColor2"), color("taskColor3"), color("taskColor4")],
      },
      {
        title: "Палитра задач | Набор B / Task palette | Set B",
        controls: [color("taskColor5"), color("taskColor6"), color("taskColor7"), color("taskColor8")],
      },
    ],
  },
  {
    id: "workbench",
    title: "Крутилки / Workbench",
    groups: [
      {
        title: "Панель крутилок | Dock / Workbench | Dock",
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
        title: "Панель крутилок | Layout / Workbench | Layout",
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
        title: "Панель крутилок | Группы / Workbench | Groups",
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
        title: "Панель крутилок | Контролы / Workbench | Controls",
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
        title: "Панель крутилок | Кнопки / Workbench | Action buttons",
        controls: [range("workbenchActionBtnPadY"), range("workbenchActionBtnPadX")],
      },
    ],
  },
];


