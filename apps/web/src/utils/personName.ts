export function toShortPersonName(fullName?: string | null): string {
  const raw = (fullName ?? "").trim();
  if (!raw) return "";

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return raw;

  const firstName = parts[1];
  const lastName = parts[0];
  const initial = lastName.charAt(0).toUpperCase();
  return `${firstName} ${initial}.`;
}
