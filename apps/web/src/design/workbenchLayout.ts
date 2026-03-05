import type { DesignControls } from "./controls";
import type { KeyColors } from "./colors";

export type WorkbenchTabId =
  | "material"
  | "timeline"
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
    id: "material",
    title: "Материал / Material",
    groups: [
      {
        title: "Материал | Фон интенсивность / Material | Background intensity",
        controls: [range("matBgPinkOpacity"), range("matBgBlueOpacity"), range("matBgMintOpacity")],
      },
      {
        title: "Материал | Фон свечение / Material | Background glow",
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
        title: "Материал | Фон база / Material | Background base",
        controls: [color("keyAppBgBase"), color("keySurfaceTop"), color("keySurfaceBottom"), color("keySurfaceAlt")],
      },
      {
        title: "Материал | Карточки / Material | Cards",
        controls: [
          range("matCardBorderOpacity"),
          range("matCardShadowStrength"),
          range("matCardInsetStrength"),
          range("matTopbarBorderOpacity"),
          range("matRowHoverStrength"),
          color("keyText"),
        ],
      },
      {
        title: "Материал | Сияние / Material | Glow",
        controls: [
          range("matActiveGlowStrength"),
          range("matButtonGlowStrength"),
          range("matBadgeGlowStrength"),
          range("matScrollbarGlowStrength"),
          color("keyBtnGradFrom"),
          color("keyBtnGradTo"),
        ],
      },
      {
        title: "Материал | Кнопки навигации / Material | Navigation buttons",
        controls: [
          color("keyBtnHoverFrom"),
          color("keyBtnHoverTo"),
          color("keyNavBtnFrom"),
          color("keyNavBtnTo"),
          color("keyNavActiveFrom"),
          color("keyNavActiveTo"),
        ],
      },
    ],
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
          range("timelineShowMilestoneLabels"),
          range("textRenderingMode"),
          range("textSmoothingMode"),
          range("barInsetY"),
        ],
      },
      {
        title: "Таймлайн | Майлстоуны / Timeline | Milestones",
        controls: [
          range("milestoneSizeScale"),
          range("milestoneOpacity"),
          range("taskColorMixPercent"),
          color("keyMilestone"),
          color("keyPink"),
          color("keyBlue"),
        ],
      },
      {
        title: "Таймлайн | Акценты / Timeline | Accents",
        controls: [color("keyMint"), color("keyViolet")],
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
          range("drawerWidth"),
          range("drawerPadding"),
          range("drawerTitleSize"),
          range("drawerMetaGap"),
          range("drawerSectionGap"),
          range("drawerMiniDatesFontSize"),
        ],
      },
      {
        title: "Карточка | Тайминг / Drawer | Timing list",
        controls: [
          range("drawerMilestoneDateFontSize"),
          range("drawerMilestoneRowGap"),
          range("drawerMilestoneLabelFontSize"),
          range("drawerMilestoneLabelMaxWidth"),
          range("drawerMilestoneDotSize"),
          color("keyMilestone"),
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
          range("drawerMilestoneCellGlowOpacity"),
          range("drawerMilestoneCellShadowOpacity"),
          range("drawerMilestoneDayShadowOpacity"),
          range("drawerMilestoneCellDarkShadowOpacity"),
          range("drawerMilestoneCellDarkShadowBlur"),
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
        controls: [color("keyPink"), color("keyBlue"), color("keyMint"), color("keyViolet"), color("keyText"), color("keyMilestone")],
      },
      {
        title: "Цвета | Поверхности / Colors | Surfaces",
        controls: [
          color("keySurfaceTop"),
          color("keySurfaceBottom"),
          color("keySurfaceAlt"),
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
          color("keyLeftPillText"),
        ],
      },
      {
        title: "Цвета | Кнопки / Colors | Buttons",
        controls: [
          color("keyBtnGradFrom"),
          color("keyBtnGradTo"),
          color("keyBtnHoverFrom"),
          color("keyBtnHoverTo"),
          color("keyNavBtnFrom"),
          color("keyNavBtnTo"),
        ],
      },
      {
        title: "Цвета | Активные кнопки / Colors | Active buttons",
        controls: [color("keyNavActiveFrom"), color("keyNavActiveTo")],
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


