export type UIStyleGroup = "button" | "bubble" | "label" | "panel";

export type UIStylePropValue = string | number | boolean;

export type UIStyleEntry = {
  id: string;
  group: UIStyleGroup;
  title: string;
  description: string;
  usedIn: string[];
  props: Record<string, UIStylePropValue>;
  status?: "active" | "candidate" | "legacy";
  deprecated?: boolean;
};

export const UI_STYLE_GROUP_LABELS: Record<UIStyleGroup, string> = {
  button: "Buttons",
  bubble: "Bubbles",
  label: "Labels",
  panel: "Panels",
};

export const UI_STYLE_REGISTRY: UIStyleEntry[] = [
  {
    id: "button.primaryAction",
    group: "button",
    title: "Primary action button",
    description: "Главная action-кнопка для положительных сценариев и основного CTA.",
    usedIn: ["Admin toolbar", "Attachment preview actions", "Mini App CTA buttons"],
    props: {
      height: 42,
      radius: 14,
      fontSize: 14,
      fontWeight: 800,
      paddingX: 18,
      variant: "gradient-primary",
      borderWidth: 1,
    },
    status: "active",
  },
  {
    id: "button.ghostAction",
    group: "button",
    title: "Ghost action button",
    description: "Вторичный action без плотной заливки, для второстепенных операций и inline tools.",
    usedIn: ["Admin secondary actions", "Preset actions", "Attachment utility buttons"],
    props: {
      height: 38,
      radius: 14,
      fontSize: 13,
      fontWeight: 700,
      paddingX: 16,
      variant: "ghost",
      borderWidth: 1,
    },
    status: "active",
  },
  {
    id: "bubble.statusPill",
    group: "bubble",
    title: "Status pill",
    description: "Короткий служебный bubble для статуса, доступа и role indicator.",
    usedIn: ["Admin role badge", "Attachment status", "Auth access labels"],
    props: {
      radius: 999,
      fontSize: 11,
      fontWeight: 800,
      paddingX: 10,
      paddingY: 4,
      tone: "service",
    },
    status: "active",
  },
  {
    id: "bubble.dateBadge",
    group: "bubble",
    title: "Date badge",
    description: "Компактный bubble для дат milestones и финальных дедлайнов.",
    usedIn: ["Task drawer", "Mini App task cards", "Timeline calendar rows"],
    props: {
      radius: 12,
      fontSize: 11,
      fontWeight: 700,
      paddingX: 8,
      paddingY: 4,
      tone: "date-accent",
    },
    status: "active",
  },
  {
    id: "label.sectionTitle",
    group: "label",
    title: "Section title",
    description: "Сильный section heading для панелей, drawer zones и admin blocks.",
    usedIn: ["Admin sections", "Task drawer titles", "Inspector headings"],
    props: {
      fontSize: 22,
      fontWeight: 800,
      tone: "strong",
      letterSpacing: 0.01,
      uppercase: false,
    },
    status: "active",
  },
  {
    id: "label.metaCaption",
    group: "label",
    title: "Meta caption",
    description: "Приглушенный service label для пояснений, metadata и usage lines.",
    usedIn: ["Muted helper copy", "Card metadata", "Audit details"],
    props: {
      fontSize: 12,
      fontWeight: 500,
      tone: "muted",
      letterSpacing: 0,
      uppercase: false,
    },
    status: "active",
  },
  {
    id: "panel.glassCard",
    group: "panel",
    title: "Glass card surface",
    description: "Основная стеклянная поверхность для admin cards и drawer subsections.",
    usedIn: ["Admin cards", "Access links cards", "Attachment inspector"],
    props: {
      radius: 18,
      padding: 16,
      borderWidth: 1,
      shadowLevel: 2,
      tone: "glass-dark",
    },
    status: "active",
  },
  {
    id: "panel.nestedSection",
    group: "panel",
    title: "Nested section surface",
    description: "Вложенная панель для tab body, inspectors и grouped admin areas.",
    usedIn: ["Admin subtab body", "UI style inspector", "Settings subsections"],
    props: {
      radius: 16,
      padding: 14,
      borderWidth: 1,
      shadowLevel: 1,
      tone: "nested",
    },
    status: "candidate",
  },
];
