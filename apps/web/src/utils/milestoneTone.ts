export type MilestoneTone =
  | "storyboard"
  | "animatic"
  | "feedback"
  | "prefinal"
  | "final"
  | "master"
  | "onair"
  | "start"
  | "default";

type ToneRule = {
  tone: Exclude<MilestoneTone, "default">;
  aliases: string[];
};

// Keep backward compatibility: old EN + newer RU names.
// `draft` is merged into `storyboard`.
export const MILESTONE_TONE_ALIASES: Record<Exclude<MilestoneTone, "default">, string[]> = {
  storyboard: [
    "storyboard",
    "story board",
    "сториборд",
    "сториборд в скетче",
    "раскадровка",
    "визуальный сценарий",
    "стилшот",
    "стилшоты",
    "стилы",
    "ключевые стилшоты",
    "ключевые стилы",
    "draft",
    "драфт",
    "черновик",
    "внесение правок в сценарий",
    "общий стил ключевой сцены",
    "апдейт стилшота",
    
  ],
  animatic: [
    "драфт анимация ролика (сермат)",
    "animatic",
    "аниматик",
    "аниматика",
    "полная анимация ролика",
    "апдейт",
  ],
  feedback: [
    "feedback",
    "фидбек",
    "комментарии",
    "коммент",
    "ответ",
    "ответ клиента",
    "правки",
  ],
  prefinal: [
    "prefinal",
    "pre final",
    "предфинал",
    "префинал",
    "полная анимация ролика с вариантами музыки",
  ],
  final: [
    "final",
    "финал",
    "финальный",
    "финальная",
    "финальное",
  ],
  master: [
    "сдача",
    "мастеринг",
    "сдача на эфир",
  ],
  onair: [
    "onair",
    "on air",
    "эфир",
    "в эфир",
  ],
  start: [
    "start",
    "старт",
  ],
};

const TONE_PRIORITY: MilestoneTone[] = [
  "onair",
  "master",
  "final",
  "prefinal",
  "animatic",
  "storyboard",
  "feedback",
  "start",
  "default",
];

const TONE_RULES: ToneRule[] = [
  { tone: "onair", aliases: MILESTONE_TONE_ALIASES.onair },
  { tone: "master", aliases: MILESTONE_TONE_ALIASES.master },
  { tone: "prefinal", aliases: MILESTONE_TONE_ALIASES.prefinal },
  { tone: "final", aliases: MILESTONE_TONE_ALIASES.final },
  { tone: "animatic", aliases: MILESTONE_TONE_ALIASES.animatic },
  { tone: "storyboard", aliases: MILESTONE_TONE_ALIASES.storyboard },
  { tone: "feedback", aliases: MILESTONE_TONE_ALIASES.feedback },
  { tone: "start", aliases: MILESTONE_TONE_ALIASES.start },
];

function normalize(value?: string | null): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[_\-]+/g, " ")
    .replace(/[.,:;()[\]{}!?/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function resolveMilestoneTone(type?: string | null, label?: string | null): MilestoneTone {
  const normalizedType = normalize(type);
  const normalizedLabel = normalize(label);
  const merged = `${normalizedType} ${normalizedLabel}`.trim();
  if (!merged) return "default";

  for (const rule of TONE_RULES) {
    for (const alias of rule.aliases) {
      const needle = normalize(alias);
      if (!needle) continue;
      if (merged.includes(needle)) return rule.tone;
    }
  }

  return "default";
}

export function resolveDayTone(
  milestones: Array<{ type?: string | null; label?: string | null }>
): MilestoneTone {
  if (!milestones.length) return "default";
  const present = new Set(milestones.map((m) => resolveMilestoneTone(m.type, m.label)));
  return TONE_PRIORITY.find((tone) => present.has(tone)) ?? "default";
}

