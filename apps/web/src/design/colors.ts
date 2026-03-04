export type KeyColors = {
  keyPink: string;
  keyBlue: string;
  keyMint: string;
  keyViolet: string;
  keyMilestone: string;
  keySurfaceTop: string;
  keySurfaceBottom: string;
  keySurfaceAlt: string;
  keyText: string;
  taskColor1: string;
  taskColor2: string;
  taskColor3: string;
  taskColor4: string;
  taskColor5: string;
  taskColor6: string;
  taskColor7: string;
  taskColor8: string;
};

export const DEFAULT_KEY_COLORS: KeyColors = {
  keyPink: "#ff8ec9",
  keyBlue: "#6897ff",
  keyMint: "#66f0d6",
  keyViolet: "#9a93ff",
  keyMilestone: "#ffd46b",
  keySurfaceTop: "#18203b",
  keySurfaceBottom: "#121a32",
  keySurfaceAlt: "#1f1736",
  keyText: "#e5ecff",
  taskColor1: "#6bb8ff",
  taskColor2: "#7f8dff",
  taskColor3: "#5be2ce",
  taskColor4: "#ff90c7",
  taskColor5: "#ffb583",
  taskColor6: "#b998ff",
  taskColor7: "#8af07f",
  taskColor8: "#ffd36f",
};

export const KEY_COLORS_STORAGE_KEY = "dtm.web.keyColors.v1";

export function normalizeKeyColors(input: Partial<KeyColors>): KeyColors {
  return {
    ...DEFAULT_KEY_COLORS,
    ...input,
  };
}

export const KEY_COLOR_ITEMS: Array<{ key: keyof KeyColors; label: string }> = [
  { key: "keyPink", label: "Pink" },
  { key: "keyBlue", label: "Blue" },
  { key: "keyMint", label: "Mint" },
  { key: "keyViolet", label: "Violet" },
  { key: "keyMilestone", label: "Milestone" },
  { key: "keySurfaceTop", label: "Surface top" },
  { key: "keySurfaceBottom", label: "Surface bottom" },
  { key: "keySurfaceAlt", label: "Surface alt" },
  { key: "keyText", label: "Text" },
];

export const TASK_PALETTE_ITEMS: Array<{ key: keyof KeyColors; label: string }> = [
  { key: "taskColor1", label: "Task color 1" },
  { key: "taskColor2", label: "Task color 2" },
  { key: "taskColor3", label: "Task color 3" },
  { key: "taskColor4", label: "Task color 4" },
  { key: "taskColor5", label: "Task color 5" },
  { key: "taskColor6", label: "Task color 6" },
  { key: "taskColor7", label: "Task color 7" },
  { key: "taskColor8", label: "Task color 8" },
];
