/** Numérotation de la séance physique de cours, indépendante des examens et annulations.
 * Les documents du Planning sont la seule source; aucune écriture n'est faite.
 */
export interface ScheduledCourse {
  id?: string; teacher_id?: string | null; teacher_first_name?: string; teacher_last_name?: string;
  ue_id?: string | null; ue_code?: string; ue_name?: string;
  classe_id?: string | null; classe_name?: string; parcours?: string;
  date?: string; start_time?: string; status?: string; session_type?: string;
}
const norm = (v: unknown) => String(v ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const same = (aId: unknown, bId: unknown, aLabel: unknown, bLabel: unknown): boolean => {
  if (aId && bId) return String(aId) === String(bId);
  return !!norm(aLabel) && norm(aLabel) === norm(bLabel);
};
export function isNumberedCourse(p: ScheduledCourse): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(p.date || '') &&
    !['annule', 'annulee'].includes(norm(p.status)) && norm(p.session_type) !== 'examen' &&
    !!(p.ue_id || p.ue_code || p.ue_name);
}
export function numberedCourseSequence(plans: readonly ScheduledCourse[], target: ScheduledCourse): number | null {
  if (!target.id || !isNumberedCourse(target)) return null;
  const list = [...plans.filter(p => p.id !== target.id), target]
    .filter(p => isNumberedCourse(p) &&
      same(p.teacher_id, target.teacher_id,
        [p.teacher_first_name, p.teacher_last_name].filter(Boolean).join(' '),
        [target.teacher_first_name, target.teacher_last_name].filter(Boolean).join(' ')) &&
      same(p.ue_id, target.ue_id, p.ue_code || p.ue_name, target.ue_code || target.ue_name) &&
      same(p.classe_id, target.classe_id, p.classe_name || p.parcours, target.classe_name || target.parcours));
  list.sort((a,b) => String(a.date).localeCompare(String(b.date)) ||
    String(a.start_time || '').localeCompare(String(b.start_time || '')) ||
    String(a.id).localeCompare(String(b.id)));
  const index = list.findIndex(p => p.id === target.id);
  return index < 0 ? null : index + 1;
}
