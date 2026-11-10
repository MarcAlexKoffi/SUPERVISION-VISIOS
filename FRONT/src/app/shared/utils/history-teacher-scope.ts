/** Read-only history facets. No Firestore write or date inferred from today. */
export interface HistoryTeacherScope {
  courses: string[];
  startDate: string;
  endDate: string;
  undatedCount: number;
}

function validDay(year: number, month: number, day: number): string {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) return '';
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/** Calendar day, respecting ISO and French input; invalid dates never become today's date. */
export function asHistoryDay(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : validDay(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  if (typeof value === 'string') {
    const iso = /^\s*(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value);
    if (iso) return validDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
    const fr = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(value);
    if (fr) return validDay(Number(fr[3]), Number(fr[2]), Number(fr[1]));
    return '';
  }
  if (value && typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') {
      try { return asHistoryDay(timestamp.toDate()); } catch { return ''; }
    }
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number' && Number.isFinite(seconds)) return asHistoryDay(new Date(seconds * 1000));
  }
  return '';
}

export function asyncHistoryDateBounds(record: any): { startDate: string; endDate: string } {
  // A historic asynchronous week describes an entire period, not its creation date.
  const week = String(record?.week ?? record?.period ?? '');
  const match = /(?:semaine\s+)?du\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+au\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(week);
  if (match) {
    const first = validDay(Number(match[3]), Number(match[2]), Number(match[1]));
    const last = validDay(Number(match[6]), Number(match[5]), Number(match[4]));
    if (first && last && first <= last) return { startDate: first, endDate: last };
  }
  const oneDay = asHistoryDay(record?.date ?? record?.visit_date);
  return { startDate: oneDay, endDate: oneDay };
}

/** Teacher-scoped UE options and observed date bounds, across sync and async forms. */
export function historyTeacherScope(
  teacherName: string,
  synchronous: readonly any[],
  asynchronous: readonly any[],
  asyncTeacherName: (row: any) => string,
  asyncUeName: (row: any) => string
): HistoryTeacherScope {
  const courses = new Set<string>();
  let startDate = '';
  let endDate = '';
  let undatedCount = 0;
  const include = (name: unknown, from: string, until: string) => {
    const course = String(name ?? '').trim();
    if (course) courses.add(course);
    if (!from || !until) { undatedCount++; return; }
    if (!startDate || from < startDate) startDate = from;
    if (!endDate || until > endDate) endDate = until;
  };
  for (const row of synchronous) {
    if (row?.teacher?.name !== teacherName) continue;
    const raw = row.originalData;
    const date = raw ? asHistoryDay(raw.visit_date ?? raw.date) : asHistoryDay(row.date);
    include(row?.course?.name, date, date);
  }
  for (const row of asynchronous) {
    if (asyncTeacherName(row) !== teacherName) continue;
    const dates = asyncHistoryDateBounds(row);
    include(asyncUeName(row), dates.startDate, dates.endDate);
  }
  return {
    courses: [...courses].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
    startDate, endDate, undatedCount
  };
}

/** Default to the first teacher-scoped UE in the selector's sorted list. */
export function firstTeacherHistoryCourse(scope: HistoryTeacherScope | null): string {
  return scope?.courses[0] ?? '';
}
