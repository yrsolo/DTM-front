export type AppLocale = "ru" | "en";

export type UiText = {
  appTitle: string;
  appSubtitle: string;
  modeByBrandDesignerShow: string;
  modeByFormatBrandShow: string;
  modeByDesignerBrandShow: string;
  modeFlatBrandShow: string;
  modeByShowBrandDesigner: string;
  localeLabel: string;
  localeRu: string;
  localeEn: string;
  common: {
    loadingTitle: string;
    loadingHint: string;
    errorTitle: string;
    retry: string;
    status: string;
    unassigned: string;
    noDataTitle: string;
    noDataHint: string;
  };
  filters: {
    allDesigners: string;
    allStatuses: string;
    searchTasks: string;
    updateFromLocal: string;
    updateFromApi: string;
    autoRefreshOff: string;
    autoRefresh15s: string;
    autoRefresh30s: string;
    autoRefresh1m: string;
    autoRefresh5m: string;
    refreshing: string;
    ready: string;
    generated: string;
    updated: string;
    attempt: string;
    sortByLastMilestoneDesc: string;
    sortByLastMilestoneAsc: string;
    dateFilterTitle: string;
    dateFilterEnabled: string;
    dateFrom: string;
    dateTo: string;
    displayLimitLabel: string;
    loadLimitLabel: string;
    demoMode: string;
  };
  timeline: {
    titleByBrandDesignerShow: string;
    titleByFormatBrandShow: string;
    titleByDesignerBrandShow: string;
    titleFlatBrandShow: string;
    titleByShowBrandDesigner: string;
    staleTitle: string;
    zoomAria: string;
  };
  drawer: {
    close: string;
    designer: string;
    manager: string;
    timing: string;
    noMilestones: string;
    calendar: string;
    tags: string;
    notes: string;
    links: string;
    openSheetRow: string;
    ownerResolveHint: string;
    attachments: string;
    attachmentsEmpty: string;
    attachmentsUpload: string;
    attachmentsUploading: string;
    attachmentsFinalize: string;
    attachmentsWaiting: string;
    attachmentsUploaded: string;
    attachmentsPreview: string;
    attachmentsDownload: string;
    attachmentsDelete: string;
    attachmentsDeleting: string;
    attachmentsDeleted: string;
    attachmentsUnavailable: string;
    attachmentsActionFailed: string;
    attachmentsPreviewFailed: string;
    attachmentsDropHint: string;
    attachmentsUploadedAt: string;
    attachmentsGeneric: string;
    weekdays: [string, string, string, string, string, string, string];
  };
  workbench: {
    tabs: {
      material: string;
      colors: string;
      palette: string;
      drawer: string;
      design: string;
      leftBlock: string;
      workbench: string;
    };
    groups: {
      materialBg: string;
      materialCards: string;
      materialFx: string;
      colorsKey: string;
      colorsSurface: string;
      palette1: string;
      palette2: string;
      drawerSize: string;
      drawerCalendar: string;
      drawerHighlight: string;
      designTable: string;
      designPinned: string;
      designPinnedText: string;
      designPinnedPill: string;
      designPinnedShow: string;
      designTimeline: string;
      designOther: string;
      workbenchDock: string;
      workbenchLayout: string;
      workbenchControls: string;
      workbenchActions: string;
    };
    toggleShow: string;
    toggleHide: string;
    save: string;
    load: string;
    reset: string;
    export: string;
    import: string;
    deploy: string;
    deployPathLabel: string;
  };
};

const RU_TEXT: UiText = {
  appTitle: "Спонсорские ТНТ",
  appSubtitle: "Планирование и загрузка команды",
  modeByBrandDesignerShow: "Бренд",
  modeByFormatBrandShow: "Формат",
  modeByDesignerBrandShow: "Дизайнер",
  modeFlatBrandShow: "Задачи",
  modeByShowBrandDesigner: "Шоу",
  localeLabel: "Язык",
  localeRu: "Рус",
  localeEn: "Eng",
  common: {
    loadingTitle: "Загрузка...",
    loadingHint: "Получаем актуальный снапшот.",
    errorTitle: "Ошибка загрузки данных",
    retry: "Повторить",
    status: "Статус",
    unassigned: "Не назначен",
    noDataTitle: "Нет данных",
    noDataHint: "Снапшот пуст.",
  },
  filters: {
    allDesigners: "Все дизайнеры",
    allStatuses: "Все статусы",
    searchTasks: "Поиск задач...",
    updateFromLocal: "Обновить из локального JSON",
    updateFromApi: "Обновить JSON из API",
    autoRefreshOff: "Автообновление: выкл",
    autoRefresh15s: "Автообновление: 15с",
    autoRefresh30s: "Автообновление: 30с",
    autoRefresh1m: "Автообновление: 1м",
    autoRefresh5m: "Автообновление: 5м",
    refreshing: "Обновление...",
    ready: "Готово",
    generated: "Сгенерировано",
    updated: "Обновлено",
    attempt: "Попытка",
    sortByLastMilestoneDesc: "Сортировка: конец задачи (новые сверху)",
    sortByLastMilestoneAsc: "Сортировка: конец задачи (старые сверху)",
    dateFilterTitle: "Фильтр по дате",
    dateFilterEnabled: "Включить фильтр по дате",
    dateFrom: "С",
    dateTo: "По",
    displayLimitLabel: "Лимит задач",
    loadLimitLabel: "Лимит загрузки",
    demoMode: "Демо",
  },
  timeline: {
    titleByBrandDesignerShow: "Grant chart by brand",
    titleByFormatBrandShow: "Grant chart by format",
    titleByDesignerBrandShow: "Grant chart by designers",
    titleFlatBrandShow: "Grant chart by tasks",
    titleByShowBrandDesigner: "Grant chart by show",
    staleTitle: "Данные устарели: обновление не удалось",
    zoomAria: "Горизонтальный масштаб таймлайна",
  },
  drawer: {
    close: "Закрыть",
    designer: "Дизайнер",
    manager: "Менеджер",
    timing: "Тайминг",
    noMilestones: "Нет майлстоунов",
    calendar: "Календарь",
    tags: "Теги",
    notes: "Заметки",
    links: "Ссылки",
    openSheetRow: "Открыть строку в таблице",
    ownerResolveHint: "ownerId присутствует, но не найден в people[]",
    attachments: "Вложения",
    attachmentsEmpty: "Пока нет вложений",
    attachmentsUpload: "Загрузить файл",
    attachmentsUploading: "Получаем контракт загрузки...",
    attachmentsFinalize: "Проверяем файл и завершаем загрузку...",
    attachmentsWaiting: "Файл отправлен. Ждём публикацию вложения в snapshot.",
    attachmentsUploaded: "Вложение опубликовано.",
    attachmentsPreview: "Просмотр",
    attachmentsDownload: "Скачать",
    attachmentsDelete: "Удалить",
    attachmentsDeleting: "Удаляем вложение и ждём завершения фоновой задачи...",
    attachmentsDeleted: "Вложение удалено.",
    attachmentsUnavailable: "Недоступно",
    attachmentsActionFailed: "Не удалось выполнить действие с файлом",
    attachmentsPreviewFailed: "Не удалось открыть предпросмотр файла",
    attachmentsDropHint: "Файл загружается только по явному действию администратора",
    attachmentsUploadedAt: "Загружен",
    attachmentsGeneric: "Файл",
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  },
  workbench: {
    tabs: {
      material: "Материал",
      colors: "Цвета",
      palette: "Палитра задач",
      drawer: "Карточка",
      design: "Дизайн",
      leftBlock: "Левый блок",
      workbench: "Крутилки",
    },
    groups: {
      materialBg: "Фон",
      materialCards: "Карточки",
      materialFx: "Эффекты",
      colorsKey: "Ключевые",
      colorsSurface: "Поверхности",
      palette1: "Набор 1",
      palette2: "Набор 2",
      drawerSize: "Размеры",
      drawerCalendar: "Календарь",
      drawerHighlight: "Подсветка",
      designTable: "Таблица",
      designPinned: "Левый блок",
      designPinnedText: "Тексты",
      designPinnedPill: "Овал",
      designPinnedShow: "Шоу",
      designTimeline: "Таймлайн",
      designOther: "Прочее",
      workbenchDock: "Dock",
      workbenchLayout: "Layout",
      workbenchControls: "Controls",
      workbenchActions: "Actions",
    },
    toggleShow: "Показать Крутилки",
    toggleHide: "Скрыть Крутилки",
    save: "Сохранить",
    load: "Загрузить",
    reset: "Сброс",
    export: "Экспорт",
    import: "Импорт",
    deploy: "Deploy",
    deployPathLabel: "deploy",
  },
};

const EN_TEXT: UiText = {
  appTitle: "Спонсорские ТНТ",
  appSubtitle: "Planning and workload timeline",
  modeByBrandDesignerShow: "Brand",
  modeByFormatBrandShow: "Format",
  modeByDesignerBrandShow: "Designer",
  modeFlatBrandShow: "Tasks",
  modeByShowBrandDesigner: "Show",
  localeLabel: "Language",
  localeRu: "Rus",
  localeEn: "Eng",
  common: {
    loadingTitle: "Loading...",
    loadingHint: "Fetching snapshot data.",
    errorTitle: "Failed to load data",
    retry: "Retry",
    status: "Status",
    unassigned: "Unassigned",
    noDataTitle: "No data",
    noDataHint: "Snapshot is empty.",
  },
  filters: {
    allDesigners: "All designers",
    allStatuses: "All statuses",
    searchTasks: "Search tasks...",
    updateFromLocal: "Refresh from local JSON",
    updateFromApi: "Refresh JSON from API",
    autoRefreshOff: "Auto refresh: Off",
    autoRefresh15s: "Auto refresh: 15s",
    autoRefresh30s: "Auto refresh: 30s",
    autoRefresh1m: "Auto refresh: 1m",
    autoRefresh5m: "Auto refresh: 5m",
    refreshing: "Refreshing...",
    ready: "Ready",
    generated: "Generated",
    updated: "Updated",
    attempt: "Attempt",
    sortByLastMilestoneDesc: "Sort: task end date (newest first)",
    sortByLastMilestoneAsc: "Sort: task end date (oldest first)",
    dateFilterTitle: "Date filter",
    dateFilterEnabled: "Enable date filter",
    dateFrom: "From",
    dateTo: "To",
    displayLimitLabel: "Task limit",
    loadLimitLabel: "Load limit",
    demoMode: "Demo",
  },
  timeline: {
    titleByBrandDesignerShow: "Grant chart by brand",
    titleByFormatBrandShow: "Grant chart by format",
    titleByDesignerBrandShow: "Grant chart by designers",
    titleFlatBrandShow: "Grant chart by tasks",
    titleByShowBrandDesigner: "Grant chart by show",
    staleTitle: "Stale data: refresh failed",
    zoomAria: "Timeline horizontal zoom",
  },
  drawer: {
    close: "Close",
    designer: "Designer",
    manager: "Manager",
    timing: "Timing",
    noMilestones: "No milestones",
    calendar: "Calendar",
    tags: "Tags",
    notes: "Notes",
    links: "Links",
    openSheetRow: "Open sheet row",
    ownerResolveHint: "ownerId is present but absent in people[] mapping",
    attachments: "Attachments",
    attachmentsEmpty: "No attachments yet",
    attachmentsUpload: "Upload file",
    attachmentsUploading: "Requesting upload contract...",
    attachmentsFinalize: "Verifying file and finalizing upload...",
    attachmentsWaiting: "File uploaded. Waiting for snapshot publication.",
    attachmentsUploaded: "Attachment published.",
    attachmentsPreview: "Preview",
    attachmentsDownload: "Download",
    attachmentsDelete: "Delete",
    attachmentsDeleting: "Deleting attachment and waiting for background job...",
    attachmentsDeleted: "Attachment deleted.",
    attachmentsUnavailable: "Unavailable",
    attachmentsActionFailed: "Failed to complete file action",
    attachmentsPreviewFailed: "Failed to open file preview",
    attachmentsDropHint: "File upload is available only as an explicit admin action",
    attachmentsUploadedAt: "Uploaded",
    attachmentsGeneric: "File",
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  },
  workbench: {
    tabs: {
      material: "Material",
      colors: "Colors",
      palette: "Task palette",
      drawer: "Drawer",
      design: "Design",
      leftBlock: "Left block",
      workbench: "Workbench",
    },
    groups: {
      materialBg: "Background",
      materialCards: "Cards",
      materialFx: "Effects",
      colorsKey: "Key",
      colorsSurface: "Surfaces",
      palette1: "Set 1",
      palette2: "Set 2",
      drawerSize: "Size",
      drawerCalendar: "Calendar",
      drawerHighlight: "Highlight",
      designTable: "Table",
      designPinned: "Pinned left block",
      designPinnedText: "Texts",
      designPinnedPill: "Pill",
      designPinnedShow: "Show",
      designTimeline: "Timeline",
      designOther: "Other",
      workbenchDock: "Dock",
      workbenchLayout: "Layout",
      workbenchControls: "Controls",
      workbenchActions: "Actions",
    },
    toggleShow: "Show Workbench",
    toggleHide: "Hide Workbench",
    save: "Save",
    load: "Load",
    reset: "Reset",
    export: "Export",
    import: "Import",
    deploy: "Deploy",
    deployPathLabel: "deploy",
  },
};

const UI_TEXTS: Record<AppLocale, UiText> = {
  ru: RU_TEXT,
  en: EN_TEXT,
};

export function getUiText(locale: AppLocale): UiText {
  return UI_TEXTS[locale] ?? RU_TEXT;
}
