/** Shared, side-effect-free rules for the Lot 3 timetable. All dates are local ISO days. */
export type SessionStatus = 'À superviser' | 'Supervisé' | 'Annulé';
export interface ScheduleSlot {
  id?: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  teacher_id?: string | null;
  classe_id?: string | null;
  parcours?: string | null; // Legacy class name, retained for old documents.
  status?: SessionStatus;
}

export function minutes(value: string | null | undefined): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function validateSlot(slot: ScheduleSlot): string | null {
  if (!slot.date || !/^\d{4}-\d{2}-\d{2}$/.test(slot.date) ||
      Number.isNaN(Date.parse(`${slot.date}T12:00:00`)) ||
      new Date(`${slot.date}T12:00:00`).toLocaleDateString('en-CA') !== slot.date) {
    return 'Date invalide (format attendu : AAAA-MM-JJ).';
  }
  const start = minutes(slot.start_time);
  const end = minutes(slot.end_time);
  if (start === null || end === null) return 'Heures de début et de fin obligatoires (HH:mm).';
  if (start >= end) return 'L’heure de fin doit être postérieure à l’heure de début.';
  if (!slot.teacher_id || !(slot.classe_id || slot.parcours)) return 'Enseignant et classe obligatoires.';
  return null;
}

export function conflictsWith(candidate: ScheduleSlot, other: ScheduleSlot): boolean {
  if (candidate.id && other.id === candidate.id) return false;
  if (candidate.status === 'Annulé' || other.status === 'Annulé') return false;
  if (candidate.date !== other.date) return false;
  const s1 = minutes(candidate.start_time), e1 = minutes(candidate.end_time);
  const s2 = minutes(other.start_time), e2 = minutes(other.end_time);
  if (s1 === null || e1 === null || s2 === null || e2 === null) return false;
  if (!(s1 < e2 && s2 < e1)) return false; // Touching endpoints are allowed.
  const sameTeacher = !!(candidate.teacher_id && other.teacher_id && candidate.teacher_id === other.teacher_id);
  const sameClassById = !!(candidate.classe_id && other.classe_id && candidate.classe_id === other.classe_id);
  // A legacy document does not always have classe_id, so compare its stored class name.
  const sameClassByName = !!(candidate.parcours && other.parcours && candidate.parcours === other.parcours && (!candidate.classe_id || !other.classe_id));
  return sameTeacher || sameClassById || sameClassByName;
}

export function firstConflict(candidate: ScheduleSlot, existing: ScheduleSlot[]): ScheduleSlot | undefined {
  return existing.find(slot => conflictsWith(candidate, slot));
}

export function sortedTeacherSchedule(items: ScheduleSlot[], teacherId: string): ScheduleSlot[] {
  return items.filter(item => item.teacher_id === teacherId)
    .sort((a, b) => `${a.date} ${a.start_time || ''}`.localeCompare(`${b.date} ${b.start_time || ''}`));
}

export function isRescheduled(oldSlot: ScheduleSlot, newSlot: ScheduleSlot): boolean {
  return oldSlot.date !== newSlot.date || oldSlot.start_time?.slice(0, 5) !== newSlot.start_time?.slice(0, 5) || oldSlot.end_time?.slice(0, 5) !== newSlot.end_time?.slice(0, 5);
}

/** Detects a reprogramming while a prefilled supervision form is open. */
export function planningFingerprint(slot: ScheduleSlot & { ue_id?:string|null }): string {
  return JSON.stringify([slot.date,slot.start_time?.slice(0,5),slot.end_time?.slice(0,5),
    slot.teacher_id || null,slot.ue_id || null,slot.classe_id || slot.parcours || null]);
}
