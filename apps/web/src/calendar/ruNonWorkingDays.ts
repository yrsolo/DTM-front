const NON_WORKING_CACHE = new Map<number, Set<string>>();
const HOLIDAY_TRANSFER_CACHE = new Map<number, Set<string>>();

function isoUtc(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIsoToUtcDate(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const out = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(out.getTime()) ? null : out;
}

function getFixedFederalHolidays(year: number): Set<string> {
  return new Set<string>([
    isoUtc(year, 1, 1),
    isoUtc(year, 1, 2),
    isoUtc(year, 1, 3),
    isoUtc(year, 1, 4),
    isoUtc(year, 1, 5),
    isoUtc(year, 1, 6),
    isoUtc(year, 1, 7),
    isoUtc(year, 1, 8),
    isoUtc(year, 2, 23),
    isoUtc(year, 3, 8),
    isoUtc(year, 5, 1),
    isoUtc(year, 5, 9),
    isoUtc(year, 6, 12),
    isoUtc(year, 11, 4),
  ]);
}

async function fetchNonWorkingDaysByYear(year: number): Promise<Set<string>> {
  const cached = NON_WORKING_CACHE.get(year);
  if (cached) return cached;

  try {
    const res = await fetch(`https://isdayoff.ru/api/getdata?year=${year}&cc=ru`, {
      headers: { accept: "text/plain" },
    });
    if (!res.ok) {
      const empty = new Set<string>();
      NON_WORKING_CACHE.set(year, empty);
      return empty;
    }

    const payload = (await res.text()).trim();
    const out = new Set<string>();
    const maxDays = Math.min(payload.length, 366);

    for (let i = 0; i < maxDays; i += 1) {
      if (payload[i] !== "1") continue;
      const date = new Date(Date.UTC(year, 0, 1 + i));
      out.add(isoUtc(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()));
    }

    NON_WORKING_CACHE.set(year, out);
    return out;
  } catch {
    const empty = new Set<string>();
    NON_WORKING_CACHE.set(year, empty);
    return empty;
  }
}

export async function fetchRuHolidayAndTransferDaysByYear(year: number): Promise<Set<string>> {
  const cached = HOLIDAY_TRANSFER_CACHE.get(year);
  if (cached) return cached;

  const fixed = getFixedFederalHolidays(year);
  const nonWorking = await fetchNonWorkingDaysByYear(year);
  const out = new Set<string>(fixed);

  for (const iso of nonWorking) {
    const d = parseIsoToUtcDate(iso);
    if (!d) continue;
    const wd = d.getUTCDay();
    const isWeekday = wd >= 1 && wd <= 5;
    if (isWeekday) out.add(iso);
  }

  HOLIDAY_TRANSFER_CACHE.set(year, out);
  return out;
}

export async function fetchRuHolidayAndTransferDaysInRange(
  startYear: number,
  endYear: number
): Promise<Set<string>> {
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y += 1) years.push(y);
  const sets = await Promise.all(years.map((y) => fetchRuHolidayAndTransferDaysByYear(y)));
  const merged = new Set<string>();
  for (const set of sets) {
    for (const iso of set) merged.add(iso);
  }
  return merged;
}
