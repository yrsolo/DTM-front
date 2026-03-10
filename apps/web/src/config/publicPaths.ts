export function resolvePublicAssetUrl(path: string): string {
  const normalized = path.replace(/^\/+/, "");

  if (typeof document !== "undefined" && document.baseURI) {
    return new URL(normalized, document.baseURI).toString();
  }

  if (typeof window !== "undefined" && window.location) {
    return new URL(normalized, window.location.href).toString();
  }

  return `/${normalized}`;
}

