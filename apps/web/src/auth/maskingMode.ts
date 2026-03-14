export type MaskingMode = "auto" | "forced";

export const MASKING_MODE_STORAGE_KEY = "dtm.maskingMode.v1";

export function normalizeMaskingMode(input: unknown): MaskingMode {
  return input === "forced" ? "forced" : "auto";
}

export function readMaskingMode(): MaskingMode {
  if (typeof window === "undefined") return "auto";
  try {
    return normalizeMaskingMode(localStorage.getItem(MASKING_MODE_STORAGE_KEY));
  } catch {
    return "auto";
  }
}

export function writeMaskingMode(mode: MaskingMode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MASKING_MODE_STORAGE_KEY, normalizeMaskingMode(mode));
  } catch {
    // ignore storage errors
  }
}

export function isMaskingForced(): boolean {
  return readMaskingMode() === "forced";
}
