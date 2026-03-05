export type KeyColors = {
  keyPink: string;
  keyBlue: string;
  keyMint: string;
  keyViolet: string;
  keyMilestone: string;
  keyCursorTrail: string;
  keyLeftPillText: string;
  keySurfaceTop: string;
  keySurfaceBottom: string;
  keySurfaceAlt: string;
  keyText: string;
  keyBtnGradFrom: string;
  keyBtnGradTo: string;
  keyBtnHoverFrom: string;
  keyBtnHoverTo: string;
  keyNavBtnFrom: string;
  keyNavBtnTo: string;
  keyNavActiveFrom: string;
  keyNavActiveTo: string;
  keyBackdropLeft: string;
  keyBackdropRight: string;
  keyBackdropBottom: string;
  keyAppBgTop: string;
  keyAppBgMid: string;
  keyAppBgBottom: string;
  keyAppBgBase: string;
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
  keyCursorTrail: "#ffd46b",
  keyLeftPillText: "#ffd0de",
  keySurfaceTop: "#18203b",
  keySurfaceBottom: "#121a32",
  keySurfaceAlt: "#1f1736",
  keyText: "#e5ecff",
  keyBtnGradFrom: "#ff91cb",
  keyBtnGradTo: "#6f89ff",
  keyBtnHoverFrom: "#ff9dd3",
  keyBtnHoverTo: "#7c96ff",
  keyNavBtnFrom: "#1b2440",
  keyNavBtnTo: "#251f45",
  keyNavActiveFrom: "#ff8ec9",
  keyNavActiveTo: "#9a93ff",
  keyBackdropLeft: "#ff8ec9",
  keyBackdropRight: "#6897ff",
  keyBackdropBottom: "#66f0d6",
  keyAppBgTop: "#070b16",
  keyAppBgMid: "#090e1b",
  keyAppBgBottom: "#070b15",
  keyAppBgBase: "#0a0d17",
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
  { key: "keyCursorTrail", label: "Cursor trail" },
  { key: "keyLeftPillText", label: "Left pill text" },
  { key: "keySurfaceTop", label: "Surface top" },
  { key: "keySurfaceBottom", label: "Surface bottom" },
  { key: "keySurfaceAlt", label: "Surface alt" },
  { key: "keyText", label: "Text" },
  { key: "keyBtnGradFrom", label: "Button from" },
  { key: "keyBtnGradTo", label: "Button to" },
  { key: "keyBtnHoverFrom", label: "Button hover from" },
  { key: "keyBtnHoverTo", label: "Button hover to" },
  { key: "keyNavBtnFrom", label: "Nav button from" },
  { key: "keyNavBtnTo", label: "Nav button to" },
  { key: "keyNavActiveFrom", label: "Nav active from" },
  { key: "keyNavActiveTo", label: "Nav active to" },
  { key: "keyBackdropLeft", label: "Backdrop left glow" },
  { key: "keyBackdropRight", label: "Backdrop right glow" },
  { key: "keyBackdropBottom", label: "Backdrop bottom glow" },
  { key: "keyAppBgTop", label: "App bg top" },
  { key: "keyAppBgMid", label: "App bg mid" },
  { key: "keyAppBgBottom", label: "App bg bottom" },
  { key: "keyAppBgBase", label: "App bg base" },
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
