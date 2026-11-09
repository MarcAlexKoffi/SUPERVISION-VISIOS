/** Shared, read-only projections for class and teacher timetables.
 * The supervisor list intentionally keeps cancelled sessions for traceability.
 */
export interface EdtSession {
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  status?: string | null;
  session_type?: string | null;
  ue_name?: string | null;
  title?: string | null;
  teacher_id?: string | null;
  teacher_first_name?: string | null;
  teacher_last_name?: string | null;
  classe_name?: string | null;
  parcours?: string | null;
}

export function isCancelledSession(status: string | null | undefined): boolean {
  const normalized = String(status ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return normalized === 'annule' || normalized === 'annulee';
}

export function activeEdtSessions<T extends EdtSession>(sessions: readonly T[]): T[] {
  return sessions.filter(session => !isCancelledSession(session.status));
}

/** Keep date parsing independent from locale/timezone conversion. */
export function dayKey(value: string | null | undefined): string {
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

export function timeMinutes(value: string | null | undefined): number | null {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value ?? ''));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 24 || m > 59 || (h === 24 && m !== 0)) return null;
  return h * 60 + m;
}

export function edtHourRange(sessions: readonly EdtSession[], fullDay = false): {startHour: number; endHour: number} {
  if (fullDay) return { startHour: 8, endHour: 24 };
  const starts: number[] = [];
  const ends: number[] = [];
  for (const session of activeEdtSessions(sessions)) {
    const end = timeMinutes(session.end_time);
    const start = timeMinutes(session.start_time) ?? (end === null ? null : Math.max(0, end - 60));
    if (start !== null && end !== null && end > start) { starts.push(start); ends.push(end); }
  }
  if (!starts.length) return {startHour: 8, endHour: 12};
  const startHour = Math.max(0, Math.floor(Math.min(...starts) / 60));
  const endHour = Math.min(24, Math.ceil(Math.max(...ends) / 60));
  return {startHour, endHour: Math.max(startHour + 1, endHour)};
}

export function normalizedEdtIdentity(value: string, kind: 'class' | 'teacher'): string {
  const normalized = (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .trim().replace(/\s+/g, kind === 'teacher' ? '-' : '_')
    .replace(/[-_]{2,}/g, kind === 'teacher' ? '-' : '_');
  return normalized || (kind === 'teacher' ? 'Enseignant' : 'Toutes_classes');
}

function shortMonth(date: Date): string {
  return new Intl.DateTimeFormat('fr-FR', {month: 'short'}).format(date)
    .replace(/\./g, '').replace(/^(.)/, first => first.toUpperCase());
}

/** Expected example: EDT_09-15Nov.2026-MAFIDA_1A.pdf */
export function edtPdfFilename(start: Date, end: Date, subject: string, kind: 'class' | 'teacher'): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const isSameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
  const dateRange = isSameMonth
    ? `${pad(start.getDate())}-${pad(end.getDate())}${shortMonth(end)}.${end.getFullYear()}`
    : `${pad(start.getDate())}${shortMonth(start)}.${start.getFullYear()}-${pad(end.getDate())}${shortMonth(end)}.${end.getFullYear()}`;
  return `EDT_${dateRange}-${normalizedEdtIdentity(subject, kind)}.pdf`;
}
