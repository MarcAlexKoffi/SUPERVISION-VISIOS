/** Lot 3 backend invariants. Kept in sync with FRONT/services/planning-rules.ts. */
export interface Slot {
  id?: string;
  date: string;
  start_time?: string | null;
  end_time?: string | null;
  teacher_id?: string | null;
  classe_id?: string | null;
  parcours?: string | null;
  status?: string;
}
export class PlanningError extends Error {
  constructor(public code: number, message: string) {super(message);}
}
export function minutes(value?: string | null): number | null {
  if (!value || !/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value)) return null;
  const [h,m] = value.split(':').map(Number); return h*60+m;
}
export function slotValidation(v: Slot): string | null {
  if (!v.date || !/^\d{4}-\d{2}-\d{2}$/.test(v.date) || Number.isNaN(Date.parse(`${v.date}T12:00:00`)) ||
      new Date(`${v.date}T12:00:00`).toLocaleDateString('en-CA') !== v.date) return 'Date invalide.';
  const start=minutes(v.start_time), end=minutes(v.end_time);
  if (start === null || end === null) return 'Heures de début et de fin obligatoires.';
  if (start >= end) return 'L’heure de fin doit être postérieure à l’heure de début.';
  if (!v.teacher_id || (!v.parcours && !v.classe_id)) return 'Enseignant et classe obligatoires.';
  return null;
}
export function slotConflict(a: Slot,b:Slot):boolean {
  if (a.id && b.id === a.id || a.status === 'Annulé' || b.status === 'Annulé' || a.date !== b.date) return false;
  const sa=minutes(a.start_time),ea=minutes(a.end_time),sb=minutes(b.start_time),eb=minutes(b.end_time);
  if (sa === null || ea === null || sb === null || eb === null || !(sa < eb && sb < ea)) return false;
  return !!(a.teacher_id && b.teacher_id && a.teacher_id === b.teacher_id) ||
    !!(a.classe_id && b.classe_id && a.classe_id === b.classe_id) ||
    !!(a.parcours && b.parcours && a.parcours === b.parcours && (!a.classe_id || !b.classe_id));
}
export function slotOf(p:Slot):Slot {
  return {id:p.id,date:p.date,start_time:p.start_time,end_time:p.end_time,teacher_id:p.teacher_id,classe_id:p.classe_id,parcours:p.parcours,status:p.status};
}
export function assertNoConflict(candidate: Slot, existing: Slot[]):void {
  const conflict=existing.find(p=>slotConflict(candidate,p));
  if (conflict) throw new PlanningError(409, `Conflit horaire (${conflict.start_time}-${conflict.end_time}) : enseignant ou classe déjà occupé.`);
}
export function combined(rows: Slot[], entries: Record<string,Slot>):Slot[] {
  const map=new Map(rows.map(r=>[r.id!,r]));
  Object.entries(entries).forEach(([id,slot])=>map.set(id,{...slot,id}));
  return [...map.values()];
}
export function moved(old:Slot, updated:Slot):boolean {
  return old.date!==updated.date || old.start_time?.slice(0,5)!==updated.start_time?.slice(0,5) || old.end_time?.slice(0,5)!==updated.end_time?.slice(0,5);
}

export function planningFingerprint(slot: Slot & { ue_id?:string|null }):string {
  return JSON.stringify([slot.date,slot.start_time?.slice(0,5),slot.end_time?.slice(0,5),
    slot.teacher_id || null,slot.ue_id || null,slot.classe_id || slot.parcours || null]);
}
