export function formatTaskIdForUi(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return "-";
  const raw = String(id).trim();
  if (!raw) return "-";

  // Keep short numeric ids as-is.
  if (/^\d+$/.test(raw) && raw.length <= 12) return raw;

  // UUID-like ids: show compact readable prefix.
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(raw)) {
    return raw.slice(0, 8);
  }

  // Generic long ids.
  return raw.length > 12 ? raw.slice(0, 12) : raw;
}

