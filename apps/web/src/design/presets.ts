import {
  DEFAULT_DESIGN_CONTROLS,
  DESIGN_CONTROLS_STORAGE_KEY,
  type DesignControls,
  normalizeDesignControls,
} from "./controls";
import { DEFAULT_KEY_COLORS, KEY_COLORS_STORAGE_KEY, type KeyColors, normalizeKeyColors } from "./colors";
import { resolvePublicAssetUrl } from "../config/publicPaths";
import { getAuthRequestBase } from "../config/runtimeContour";

export type PresetKind = "color" | "layout";
export type PresetSourceKind = "builtin" | "cloud";
export type PresetAvailability = "ready" | "broken" | "unavailable";

export type PresetSummary = {
  id: string;
  kind: PresetKind;
  name: string;
  description: string | null;
  authorDisplayName: string | null;
  assetUrl: string;
  sourceKind: PresetSourceKind;
  revision: number | null;
  updatedAt: string | null;
  canEdit: boolean;
  isDefault: boolean;
  availability: PresetAvailability;
};

type BuiltinPresetIndex = {
  presets?: Array<{
    id: string;
    name: string;
    description?: string | null;
    authorDisplayName?: string | null;
    assetPath: string;
    revision?: number | null;
    updatedAt?: string | null;
    isDefault?: boolean;
  }>;
};

type CloudPresetListResponse = {
  presets?: Array<{
    id: string;
    kind: PresetKind;
    name: string;
    description?: string | null;
    authorDisplayName?: string | null;
    storageUrl: string;
    revision?: number | null;
    updatedAt?: string | null;
    canEdit?: boolean;
    isDefault?: boolean;
    availability?: PresetAvailability;
  }>;
  defaults?: Partial<Record<PresetKind, string | null>>;
};

export const LEGACY_UI_PRESET_STORAGE_KEY = "dtm.web.uiPreset.v1";
export const ACTIVE_COLOR_PRESET_ID_STORAGE_KEY = "dtm.web.preset.activeColor.v1";
export const ACTIVE_LAYOUT_PRESET_ID_STORAGE_KEY = "dtm.web.preset.activeLayout.v1";

export function readStoredActivePresetId(kind: PresetKind): string | null {
  try {
    return localStorage.getItem(
      kind === "color" ? ACTIVE_COLOR_PRESET_ID_STORAGE_KEY : ACTIVE_LAYOUT_PRESET_ID_STORAGE_KEY
    );
  } catch {
    return null;
  }
}

export function writeStoredActivePresetId(kind: PresetKind, value: string | null) {
  try {
    const key = kind === "color" ? ACTIVE_COLOR_PRESET_ID_STORAGE_KEY : ACTIVE_LAYOUT_PRESET_ID_STORAGE_KEY;
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
}

function readLegacyPresetRecord(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(LEGACY_UI_PRESET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function readStoredLayoutDraft(): DesignControls {
  try {
    const raw = localStorage.getItem(DESIGN_CONTROLS_STORAGE_KEY);
    if (raw) return normalizeDesignControls(JSON.parse(raw) as Partial<DesignControls>);
  } catch {
    // ignore invalid draft
  }

  const legacy = readLegacyPresetRecord();
  if (legacy?.design && typeof legacy.design === "object") {
    return normalizeDesignControls(legacy.design as Partial<DesignControls>);
  }

  if (legacy) {
    return normalizeDesignControls(legacy as Partial<DesignControls>);
  }

  return DEFAULT_DESIGN_CONTROLS;
}

export function readStoredColorDraft(): KeyColors {
  try {
    const raw = localStorage.getItem(KEY_COLORS_STORAGE_KEY);
    if (raw) return normalizeKeyColors(JSON.parse(raw) as Partial<KeyColors>);
  } catch {
    // ignore invalid draft
  }

  const legacy = readLegacyPresetRecord();
  if (legacy?.keyColors && typeof legacy.keyColors === "object") {
    return normalizeKeyColors(legacy.keyColors as Partial<KeyColors>);
  }

  return DEFAULT_KEY_COLORS;
}

function builtinIndexUrl(kind: PresetKind): string {
  return resolvePublicAssetUrl(`config/UI/${kind === "color" ? "colors" : "layouts"}/index.json`);
}

function fallbackBuiltinPresets(kind: PresetKind): PresetSummary[] {
  if (kind === "color") {
    return [
      {
        id: "builtin:dtm-default-colors",
        kind,
        name: "DTM Default Colors",
        description: "Fallback color preset bundled with the frontend.",
        authorDisplayName: "DTM",
        assetUrl: resolvePublicAssetUrl("config/UI/colors/default.json"),
        sourceKind: "builtin",
        revision: 1,
        updatedAt: null,
        canEdit: false,
        isDefault: true,
        availability: "ready",
      },
    ];
  }

  return [
    {
      id: "builtin:deploy-layout",
      kind,
      name: "Deploy Layout",
      description: "Layout preset bundled from the deployed design-controls baseline.",
      authorDisplayName: "DTM",
      assetUrl: resolvePublicAssetUrl("config/UI/layouts/deploy.json"),
      sourceKind: "builtin",
      revision: 1,
      updatedAt: null,
      canEdit: false,
      isDefault: true,
      availability: "ready",
    },
  ];
}

export async function loadBuiltinPresetCatalog(kind: PresetKind): Promise<PresetSummary[]> {
  try {
    const res = await fetch(builtinIndexUrl(kind), {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) {
      return fallbackBuiltinPresets(kind);
    }

    const parsed = (await res.json()) as BuiltinPresetIndex;
    if (!Array.isArray(parsed.presets) || parsed.presets.length === 0) {
      return fallbackBuiltinPresets(kind);
    }

    return parsed.presets.map((preset) => ({
      id: preset.id,
      kind,
      name: preset.name,
      description: preset.description ?? null,
      authorDisplayName: preset.authorDisplayName ?? "DTM",
      assetUrl: resolvePublicAssetUrl(preset.assetPath),
      sourceKind: "builtin",
      revision: preset.revision ?? 1,
      updatedAt: preset.updatedAt ?? null,
      canEdit: false,
      isDefault: Boolean(preset.isDefault),
      availability: "ready",
    }));
  } catch {
    return fallbackBuiltinPresets(kind);
  }
}

export async function loadCloudPresetCatalog(
  kind: PresetKind
): Promise<{ presets: PresetSummary[]; available: boolean; defaultPresetId: string | null }> {
  try {
    const res = await fetch(`${getAuthRequestBase()}/presets?kind=${encodeURIComponent(kind)}`, {
      credentials: "include",
      headers: { accept: "application/json" },
      cache: "no-store",
    });

    if (!res.ok) {
      return { presets: [], available: false, defaultPresetId: null };
    }

    const payload = (await res.json()) as CloudPresetListResponse;
    const presets = Array.isArray(payload.presets)
      ? payload.presets.map((preset) => ({
          id: preset.id,
          kind: preset.kind,
          name: preset.name,
          description: preset.description ?? null,
          authorDisplayName: preset.authorDisplayName ?? null,
          assetUrl: preset.storageUrl,
          sourceKind: "cloud" as const,
          revision: preset.revision ?? null,
          updatedAt: preset.updatedAt ?? null,
          canEdit: Boolean(preset.canEdit),
          isDefault: Boolean(preset.isDefault),
          availability: preset.availability ?? "ready",
        }))
      : [];

    return {
      presets,
      available: true,
      defaultPresetId: payload.defaults?.[kind] ?? null,
    };
  } catch {
    return { presets: [], available: false, defaultPresetId: null };
  }
}

export function mergePresetCatalogs(
  builtinPresets: PresetSummary[],
  cloudPresets: PresetSummary[],
  defaultPresetId: string | null
): PresetSummary[] {
  const merged = [...builtinPresets, ...cloudPresets];
  if (!defaultPresetId) return merged;
  return merged.map((preset) => ({
    ...preset,
    isDefault: preset.id === defaultPresetId,
  }));
}

export async function loadColorPresetAsset(assetUrl: string): Promise<KeyColors | null> {
  try {
    const res = await fetch(assetUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = (await res.json()) as Record<string, unknown>;
    const keyColors =
      parsed && typeof parsed === "object" && parsed.keyColors && typeof parsed.keyColors === "object"
        ? parsed.keyColors
        : parsed;
    return normalizeKeyColors(keyColors as Partial<KeyColors>);
  } catch {
    return null;
  }
}

export async function loadLayoutPresetAsset(assetUrl: string): Promise<DesignControls | null> {
  try {
    const res = await fetch(assetUrl, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = (await res.json()) as Record<string, unknown>;
    const design =
      parsed && typeof parsed === "object" && parsed.design && typeof parsed.design === "object"
        ? parsed.design
        : parsed;
    return normalizeDesignControls(design as Partial<DesignControls>);
  } catch {
    return null;
  }
}
