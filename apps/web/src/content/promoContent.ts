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
  icon?: "rocket" | "file" | "status";
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
    cta: { label: "Открыть систему", href: "/" },
  },
  screens: [
    {
      id: "promo-hero",
      navLabel: "Старт",
      name: "Hero Tablet",
      kind: "hero",
      eyebrow: "Менеджер задач для дизайн-команд",
      title: ["Таблица на входе.", "Порядок на выходе."],
      body: [
        "Система превращает привычную рабочую таблицу в быстрый, живой и удобный инструмент для дизайн-команды. Без боли, лишних ритуалов и ощущения, что трекер задач снова победил человека.",
      ],
      objectAsset: "objectTablet",
      actions: [
        { label: "Открыть систему", href: "/", tone: "primary" },
        { label: "Смотреть ниже", href: "#promo-transition", tone: "secondary" },
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
        "Не нужно прыгать между таблицей, трекером и сообщениями, чтобы понять, что происходит.",
      ],
      backgroundAsset: "sceneSystem",
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
        "Не нужно ждать ноутбук, чтобы снова собрать проект в голове и вспомнить, где остановилась команда.",
        "Система остаётся такой же ясной на ходу: сроки, материалы и контекст лежат рядом, а не прячутся по вкладкам.",
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
        "Лишние ритуалы, лишние поля и бесконечные переключения между окнами быстро съедают внимание команды.",
        "Продюсер начинает обслуживать интерфейс вместо проекта, а дизайнер всё чаще ищет не решение, а нужный статус.",
        "Чем сложнее трекер, тем больше сил уходит не на работу, а на выживание внутри системы.",
      ],
      backgroundAsset: "sceneCurved",
    },
    {
      id: "promo-benefits",
      navLabel: "Команда",
      name: "Team Benefits Path",
      kind: "small-labels",
      title: ["Что получает команда"],
      body: ["Наконец-то можно просто открыть и понять, что происходит."],
      backgroundAsset: "sceneTeamBenefits",
      featureItems: [
        {
          title: "Быстрый доступ",
          text: "Что сейчас в работе. Дедлайны горят. Глобальный обзор.",
          icon: "rocket",
        },
        {
          title: "Материалы",
          text: "Где лежит ТЗ. Какие файлы приложены. Всё в одном месте.",
          icon: "file",
        },
        {
          title: "Статус",
          text: "Что согласовано, а что зависло. Меньше уточняющих сообщений.",
          icon: "status",
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
        "Дизайнеры и остальные участники команды получают быстрый доступ к самой важной информации. Всё это можно увидеть быстрее, чем обычно успевает открыться очередной тяжёлый таск-трекер.",
        "Система сама напоминает о сроках и помогает не пропускать дедлайны.",
      ],
      backgroundAsset: "sceneQuestionsTablet",
    },
    {
      id: "promo-analytics-panel",
      navLabel: "Аналитика",
      name: "Analytics Panel",
      kind: "panel-cutout",
      title: ["Аналитика в", "реальном времени"],
      body: [
        "Система показывает проект без ручной сборки статусов и сводок.",
        "Команда видит движение задач сразу, а не после очередного отчёта.",
      ],
      backgroundAsset: "sceneAnalyticsPanel",
    },
    {
      id: "promo-analytics-monitor",
      navLabel: "Монитор",
      name: "Analytics Monitor",
      kind: "right-standard",
      title: ["Аналитика, которую", "можно понять"],
      body: [
        "Видно, где работа ускоряется, где стопорится и где нужны решения.",
        "Аналитика здесь не для отчёта ради отчёта, а для реального управления процессом.",
      ],
      bullets: ["Обзор нагрузки по месяцам", "Выявление узких мест", "Динамика движения задач"],
      backgroundAsset: "sceneAnalyticsMonitor",
    },
    {
      id: "promo-analytics-stage",
      navLabel: "Порядок",
      name: "Analytics Stage",
      kind: "left-hero",
      eyebrow: "Наглядный контроль проекта",
      title: ["Видно, где ускорение.", "И где узкое место."],
      body: [
        "Сложные места больше не прячутся между вкладками и согласованиями.",
        "Команда видит, где поток идёт ровно, где тормозит и где нужен следующий шаг от продюсера, дизайнера или клиента.",
      ],
      bullets: ["Текущее состояние проекта", "Пробки и задержки по этапам", "Доступ с компьютера и телефона"],
      actions: [
        { label: "Открыть систему", href: "/", tone: "primary" },
        { label: "Смотреть ниже", href: "#promo-speed-order", tone: "secondary" },
      ],
      backgroundAsset: "sceneAnalyticsStage",
    },
    {
      id: "promo-speed-order",
      navLabel: "Поток",
      name: "Speed To Order",
      kind: "right-standard",
      title: ["Таблица для скорости.", "Система для порядка."],
      body: [
        "Когда всё меняется слишком быстро, таблица даёт скорость.",
        "Но без структуры скорость быстро превращается в шум.",
        "Система переводит этот поток в ясную картину проекта: кто ведёт задачу, где дедлайн и что происходит прямо сейчас.",
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
        "Система позволяет показывать данные аккуратно и по правилам.",
        "Каждому участнику видна именно та часть проекта, которая нужна ему в работе.",
      ],
      backgroundAsset: "sceneSecurityShield",
      iconCards: [
        {
          title: "Вход через Yandex",
          text: "Быстрый вход без лишних шагов.",
          iconAsset: "objectIconYandex",
        },
        {
          title: "Маскированные данные",
          text: "Безопасный показ интерфейса там, где не нужен полный доступ.",
          iconAsset: "objectIconSafe",
        },
      ],
    },
    {
      id: "promo-stack",
      navLabel: "Стек",
      name: "Tech Stack",
      kind: "right-standard",
      eyebrow: "Архитектура и интеграции",
      title: ["React, TypeScript,", "Python и Yandex Cloud."],
      body: [
        "Фронт собран на React 18, TypeScript и Vite, а доменная схема вынесена в workspace-пакеты без расползания логики по интерфейсу.",
        "Бэкенд работает на Python 3.11: ingest из Google Sheets, Telegram webhook, reminder-пайплайн, асинхронные команды через Yandex Message Queue и snapshot/read-model в S3-совместимом Object Storage.",
        "Облачный контур живёт в Yandex Cloud Functions с monitoring через Yandex Monitoring, Managed Prometheus, DataLens и Grafana. LLM-слой подключён через OpenAI API с gpt-4o по умолчанию, а в конфиге предусмотрены failover-провайдеры YandexGPT и Gemini.",
      ],
      bullets: [
        "React 18, TypeScript, Vite, workspace packages",
        "Python 3.11, Google Sheets, Telegram, async runtime",
        "Yandex Cloud Functions, YMQ, Object Storage, OpenAI gpt-4o",
      ],
      objectAsset: "objectServer",
    },
    {
      id: "promo-final",
      navLabel: "Финал",
      name: "Final Center Stage",
      kind: "final",
      title: ["Таблица, с которой", "можно расти."],
      body: [
        "Система сохраняет скорость старта, но добавляет порядок, видимость и рабочий контур для всей команды.",
        "Не нужно выбирать между живой таблицей и тяжёлым таск-трекером: скорость остаётся с вами, а хаос — нет.",
        "Если проект растёт, процессы усложняются, а людей становится больше, интерфейс всё равно остаётся читаемым.",
      ],
      backgroundAsset: "sceneFinalStage",
      actions: [{ label: "Открыть систему", href: "/", tone: "primary" }],
    },
  ],
};
