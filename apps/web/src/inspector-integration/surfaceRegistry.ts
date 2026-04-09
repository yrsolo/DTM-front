import type { SourceGraphSnapshot } from "@dtm/workbench-inspector";
import surfacesJson from "./workbench-source-surfaces.json";

export type WorkbenchSurfaceMatchMode = "always" | "exact" | "prefix";
export type WorkbenchSurfaceKind = "shell" | "route";

export type WorkbenchSourceSurface = {
  id: string;
  kind: WorkbenchSurfaceKind;
  label: string;
  enabled: boolean;
  entry: string;
  snapshotOutputPath: string;
  matchMode: WorkbenchSurfaceMatchMode;
  paths: string[];
};

const generatedSnapshotModules = import.meta.glob("../generated/workbench-source-graph*.json", {
  eager: true,
}) as Record<string, { default: SourceGraphSnapshot } | SourceGraphSnapshot>;

const registeredSurfaces = (surfacesJson as WorkbenchSourceSurface[]).filter((surface) => surface.enabled);

function normalizePathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed || "/";
}

function toSnapshotModuleKey(snapshotOutputPath: string): string {
  const fileName = snapshotOutputPath.split(/[\\/]/).pop();
  return `../generated/${fileName}`;
}

export function getRegisteredWorkbenchSourceSurfaces(): WorkbenchSourceSurface[] {
  return registeredSurfaces;
}

export function getWorkbenchSurfaceSnapshot(surface: WorkbenchSourceSurface): SourceGraphSnapshot | null {
  const moduleKey = toSnapshotModuleKey(surface.snapshotOutputPath);
  const loaded = generatedSnapshotModules[moduleKey];
  if (!loaded) return null;
  return "default" in loaded ? loaded.default : loaded;
}

export function getMatchingWorkbenchSourceSurfaces(pathname: string): WorkbenchSourceSurface[] {
  const normalizedPathname = normalizePathname(pathname);
  return registeredSurfaces.filter((surface) => {
    if (surface.matchMode === "always") return true;
    if (surface.matchMode === "exact") {
      return surface.paths.some((candidate) => normalizePathname(candidate) === normalizedPathname);
    }
    if (surface.matchMode === "prefix") {
      return surface.paths.some((candidate) => {
        const normalizedCandidate = normalizePathname(candidate);
        return (
          normalizedPathname === normalizedCandidate ||
          normalizedPathname.startsWith(`${normalizedCandidate}/`)
        );
      });
    }
    return false;
  });
}

export function getMatchedWorkbenchSnapshots(pathname: string): Array<{
  surface: WorkbenchSourceSurface;
  snapshot: SourceGraphSnapshot;
}> {
  return getMatchingWorkbenchSourceSurfaces(pathname)
    .map((surface) => ({
      surface,
      snapshot: getWorkbenchSurfaceSnapshot(surface),
    }))
    .filter((entry): entry is { surface: WorkbenchSourceSurface; snapshot: SourceGraphSnapshot } => Boolean(entry.snapshot));
}
