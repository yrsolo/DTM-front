import type { PromoAssetId } from "./promoAssets";

type PromoAction = {
  label: string;
  href: string;
  tone?: "primary" | "secondary";
};

type PromoFeature = {
  title: string;
  text: string;
  iconAsset?: PromoAssetId;
};

type PromoScreenBase = {
  id: string;
  navLabel: string;
  name: string;
  kind:
    | "hero"
    | "transition"
    | "right-standard"
    | "left-hero"
    | "small-labels"
    | "centered"
    | "panel-cutout"
    | "security"
    | "final";
  eyebrow?: string;
  title?: string[];
  body?: string[];
  backgroundAsset?: PromoAssetId;
  objectAsset?: PromoAssetId;
  objectCaption?: string;
  actions?: PromoAction[];
  bullets?: string[];
  featureItems?: PromoFeature[];
  listItems?: string[];
  iconCards?: PromoFeature[];
};

export const promoContent: {
  navigation: {
    cta: PromoAction;
  };
  screens: PromoScreenBase[];
} = {
  navigation: {
    cta: { label: "Открыть DTM", href: "#" },
  },
  screens: [
    {
      id: "promo-hero",
      navLabel: "Старт",
      name: "Hero Tablet",
      kind: "hero",
      eyebrow: "Менеджер задач для дизайн-команд",
      title: ["Таск-трекер без перегруза.", "Порядок без ста окон."],
      body: [
        "Обычный таск-менеджер быстро обрастает статусами, окнами и полями ввода.",
        "Таблица даёт скорость, но не даёт ясной картины по людям, срокам и этапам.",
        "DTM совмещает оба подхода: привычную скорость работы и нормальную структуру проекта.",
      ],
      objectAsset: "objectTablet",
      actions: [
        { label: "Открыть DTM", href: "#", tone: "primary" },
        { label: "Посмотреть ролик", href: "#promo-transition", tone: "secondary" },
      ],
    },
    {
      id: "promo-transition",
      navLabel: "Видео",
      name: "Neon Transition + Video",
      kind: "transition",
      backgroundAsset: "sceneTransition",
    },
    {
      id: "promo-system",
      navLabel: "Система",
      name: "Unified System",
      kind: "right-standard",
      eyebrow: "Единый рабочий контур",
      title: ["Один экран.", "Вся система."],
      body: [
        "Планирование, приоритеты, исполнители и визуальный контекст собираются в одной спокойной рабочей среде.",
        "Не нужно прыгать между таблицей, таск-трекером и сообщениями, чтобы понять, что происходит.",
      ],
      backgroundAsset: "sceneSystem",
      actions: [{ label: "Попробовать DTM бесплатно", href: "#", tone: "secondary" }],
    },
    {
      id: "promo-phone",
      navLabel: "Телефон",
      name: "Phone",
      kind: "left-hero",
      eyebrow: "Мобильная версия",
      title: ["Проект под рукой.", "Не только в офисе."],
      body: [
        "Проверить дедлайны, открыть ТЗ, понять следующий шаг или быстро ответить по задаче можно прямо с телефона.",
        "DTM не заставляет ждать ноутбук, чтобы снова войти в контекст.",
      ],
      objectAsset: "objectPhone",
      objectCaption: "Дедлайны и ТЗ на ходу",
    },
    {
      id: "promo-curved",
      navLabel: "Проблема",
      name: "Curved Screen",
      kind: "right-standard",
      eyebrow: "Проблема",
      title: ["Трекеров много.", "Жить в них не хочется."],
      body: [
        "Лишние ритуалы, лишние поля и бесконечные переключения между окнами.",
        "Команда тратит внимание не на работу, а на борьбу с интерфейсом.",
      ],
      bullets: [
        "Категории, приоритеты, роли",
        "Интерфейс ради интерфейса",
        "Больше движения по системе, чем по проекту",
      ],
      backgroundAsset: "sceneCurved",
    },
    {
      id: "promo-benefits",
      navLabel: "Команда",
      name: "Team Benefits Path",
      kind: "small-labels",
      eyebrow: undefined,
      title: ["Что получает команда"],
      body: ["Наконец-то можно просто открыть систему и понять, что происходит."],
      backgroundAsset: "sceneTeamBenefits",
      featureItems: [
        {
          title: "Быстрый доступ",
          text: "Что сейчас в работе. Какие сроки горят. Общая картина без долгих поисков.",
        },
        {
          title: "Материалы",
          text: "Где лежит ТЗ. Какие файлы приложены. Всё, что нужно по задаче, в одном месте.",
        },
        {
          title: "Статус",
          text: "Что согласовано, что зависло, кому нужен следующий шаг.",
        },
      ],
    },
    {
      id: "promo-questions",
      navLabel: "Вопросы",
      name: "Central Questions Tablet",
      kind: "centered",
      title: ["Наконец-то можно просто", "открыть и понять, что происходит."],
      body: [
        "Дизайнеры, менеджеры и продюсеры быстрее получают ответ на главные вопросы по проекту.",
        "Система сама напоминает о сроках и помогает не пропускать дедлайны.",
      ],
      backgroundAsset: "sceneQuestionsTablet",
      listItems: [
        "Что сейчас в работе.",
        "Какие дедлайны горят.",
        "Какие этапы впереди.",
        "Где лежит ТЗ.",
        "Что уже согласовано.",
      ],
    },
    {
      id: "promo-analytics-panel",
      navLabel: "Аналитика",
      name: "Analytics Panel",
      kind: "panel-cutout",
      title: ["Аналитика", "в реальном времени"],
      body: [
        "DTM показывает проект без ручной сборки статусов и сводок.",
        "Команда видит движение задач сразу, а не после очередного отчёта.",
      ],
      backgroundAsset: "sceneAnalyticsPanel",
    },
    {
      id: "promo-analytics-monitor",
      navLabel: "Монитор",
      name: "Analytics Monitor",
      kind: "right-standard",
      title: ["Аналитика,", "которую можно понять"],
      body: [
        "Видно, где работа ускоряется, где стопорится и где нужны решения.",
        "Аналитика не для отчёта ради отчёта, а для реального управления процессом.",
      ],
      bullets: [
        "Обзор нагрузки по месяцам",
        "Выявление узких мест",
        "Динамика движения задач",
      ],
      backgroundAsset: "sceneAnalyticsMonitor",
    },
    {
      id: "promo-analytics-stage",
      navLabel: "Порядок",
      name: "Analytics Stage",
      kind: "left-hero",
      eyebrow: "DTM для дизайн-команд",
      title: ["Таблица на входе.", "Порядок на выходе."],
      body: [
        "Таблица хороша, когда всё нужно быстро завести и не тормозить старт.",
        "DTM берёт эту скорость и добавляет структуру: роли, сроки, этапы, видимость и наглядный ход проекта.",
      ],
      bullets: [
        "Меньше ручного контроля",
        "Понятный прогресс по этапам",
        "Доступ с компьютера и телефона",
      ],
      actions: [
        { label: "Открыть DTM", href: "#", tone: "primary" },
        { label: "Смотреть ниже", href: "#promo-speed-order", tone: "secondary" },
      ],
      backgroundAsset: "sceneAnalyticsStage",
    },
    {
      id: "promo-speed-order",
      navLabel: "Поток",
      name: "Speed To Order",
      kind: "right-standard",
      title: ["Таблица для скорости.", "DTM для порядка."],
      body: [
        "Когда всё меняется слишком быстро, таблица — это скорость.",
        "Но без структуры скорость быстро превращается в шум. DTM превращает этот поток в ясную картину проекта.",
      ],
      bullets: ["Скорость таблицы", "Поток работы", "Ясная картина"],
      backgroundAsset: "sceneSpeedOrder",
    },
    {
      id: "promo-security",
      navLabel: "Доступ",
      name: "Security / Access",
      kind: "security",
      eyebrow: "Для дизайн-команд",
      title: ["Не всё всем.", "И это прекрасно."],
      body: [
        "DTM позволяет показывать данные аккуратно и по правилам.",
        "Каждому участнику видна именно та часть проекта, которая нужна ему в работе.",
      ],
      backgroundAsset: "sceneSecurityShield",
      iconCards: [
        {
          title: "Вход через Yandex",
          text: "Быстрый и привычный доступ без лишних шагов.",
          iconAsset: "objectIconYandex",
        },
        {
          title: "Маскированные данные",
          text: "Интерфейс можно безопасно показать там, где полный доступ не нужен.",
          iconAsset: "objectIconSafe",
        },
      ],
    },
    {
      id: "promo-stack",
      navLabel: "Стек",
      name: "Tech Stack",
      kind: "right-standard",
      eyebrow: "Технологии и стек",
      title: ["Над интерфейсом", "стоит система."],
      body: [
        "DTM опирается на прозрачную технологическую основу: хранилище, связи, интеграции и управляемую инфраструктуру.",
        "Внешне это выглядит просто, потому что сложность убрана внутрь и приведена в порядок.",
      ],
      bullets: ["Инфраструктура", "Интеграции", "Надёжный контур"],
      objectAsset: "objectServer",
    },
    {
      id: "promo-final",
      navLabel: "Финал",
      name: "Final Center Stage",
      kind: "final",
      title: ["Таблица, с которой", "можно расти."],
      body: [
        "DTM сохраняет скорость старта, но даёт порядок, видимость и рабочий контур для команды.",
      ],
      backgroundAsset: "sceneFinalStage",
      actions: [{ label: "Открыть DTM", href: "#", tone: "primary" }],
    },
  ],
};
