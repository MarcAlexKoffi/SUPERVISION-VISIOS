/**
 * Rapprochement des seances du Planning et des fiches de supervision.
 * Lecture seule : aucun document Firestore n'est modifie.
 *
 * Seules deux conditions certifient une prestation : statut Supervise et fiche
 * correspondante. Les noms / codes / classe / horaires servent a etablir la
 * correspondance et a informer, jamais a exiger un identifiant administratif.
 * Une relation explicitement contradictoire n'est jamais contournee.
 */
import {
  type Lot4Class, type Lot4Document, type Lot4Filters, type Lot4Line, type Lot4Plan,
  type Lot4Supervision, type Lot4Teacher, type Lot4Ue, sessionMinutes,
} from './lot4-documents';

export interface HistoricalSources {
  teachers: readonly Lot4Teacher[];
  ues: readonly Lot4Ue[];
  classes: readonly Lot4Class[];
  plannings: readonly Lot4Plan[];
  supervisions: readonly Lot4Supervision[];
}

export interface HistoricalMatch {
  planningId: string;
  supervisionId: string;
  supervision: Lot4Supervision;
  teacherId: string;
  ueId: string;
  classId: string;
  className: string;
  actualMinutes: number | null;
}

export interface HistoricalMatches {
  byPlanningId: ReadonlyMap<string, HistoricalMatch>;
  matchedSupervisionIds: ReadonlySet<string>;
  /** Paires possibles non automatiquement choisies, a confirmer explicitement. */
  ambiguousByPlanningId: ReadonlyMap<string, readonly Lot4Supervision[]>;
}

const val = (v: unknown): string => String(v ?? '').trim();
const norm = (v: unknown): string => val(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/\s+/g, ' ');
const nameKey = (v: unknown): string => norm(v).replace(/[^a-z0-9]+/g, ' ').trim();
const teacherName = (t: Lot4Teacher): string => val(t.name) ||
  `${val(t.first_name || t.firstName)} ${val(t.last_name || t.lastName)}`.trim();
const planTeacherName = (p: Lot4Plan): string =>
  `${val(p.teacher_first_name)} ${val(p.teacher_last_name)}`.trim();
const supTeacherName = (s: Lot4Supervision): string => val(s.teacherName || s.teacher_name);
const supTeacherId = (s: Lot4Supervision): string => val(s.teacherId || s.teacher_id);
const supUeId = (s: Lot4Supervision): string => val(s.ueId || s.ue_id);
const planClassName = (p: Lot4Plan): string => val(p.classe_name || p.parcours);
const supClassName = (s: Lot4Supervision): string => val(s.level || s.classe);

export function pigierIso(value: unknown): string {
  const s = val(value);
  const t = /^\d{2}\/\d{2}\/\d{4}$/.test(s) ?
    `${s.slice(6)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const [y, m, d] = t.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? t : '';
}
function clock(value: unknown): string {
  const t = val(value);
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(t) ? t.slice(0, 5) : '';
}
export const isSupervised = (p: Lot4Plan): boolean => norm(p.status) === 'supervise';
export const isCancelled = (p: Lot4Plan): boolean => /^annul(e|ee)?$/.test(norm(p.status));
function isCourse(p: Lot4Plan): boolean {
  if (isCancelled(p)) return false;
  if (val((p as Lot4Plan & {exam_session?: string | null}).exam_session)) return false;
  const type = norm(p.session_type);
  if (/\b(examen|examens|evaluation|evaluations|epreuve|epreuves|composition|compositions|rattrapage|rattrapages|quiz|test)\b/.test(type)) return false;
  if (/\b(asynchrone|forum)\b/.test(type)) return false;
  return true;
}
function unique<T extends {id?: string}>(list: readonly T[], key: unknown,
  getLabel: (item: T) => string): T | null {
  const needle = nameKey(key);
  if (!needle) return null;
  const found = list.filter(item => nameKey(getLabel(item)) === needle);
  return found.length === 1 ? found[0] : null;
}
function resolveTeacher(id: string, label: string, src: HistoricalSources): string {
  if (id && src.teachers.some(t => val(t.id) === id)) return id;
  return val(unique(src.teachers, label, teacherName)?.id) || id;
}
function ueAliases(ue: Lot4Ue): string[] {
  return [val(ue.code), val(ue.name), `${val(ue.code)} ${val(ue.name)}`]
    .map(nameKey).filter(Boolean);
}
function resolveUe(id: string, code: string, name: string, src: HistoricalSources): string {
  if (id && src.ues.some(u => val(u.id) === id)) return id;
  for (const requested of [code, name].map(nameKey).filter(Boolean)) {
    const found = src.ues.filter(ue => ueAliases(ue).includes(requested));
    if (found.length === 1) return val(found[0].id);
  }
  return id;
}
function sameTeacher(p: Lot4Plan, s: Lot4Supervision, src: HistoricalSources,
  linked: boolean): boolean {
  const a = val(p.teacher_id), b = supTeacherId(s);
  if (a && b) return a === b;
  const pa = resolveTeacher(a, planTeacherName(p), src);
  const sb = resolveTeacher(b, supTeacherName(s), src);
  if (pa && sb) return pa === sb;
  // ID ancien/inconnu : ne jamais fusionner deux identites contradictoires.
  const pLabel = planTeacherName(p) || teacherName(src.teachers.find(t => val(t.id) === a) || {});
  const sLabel = supTeacherName(s) || teacherName(src.teachers.find(t => val(t.id) === b) || {});
  if (pLabel && sLabel && nameKey(pLabel) === nameKey(sLabel)) {
    return src.teachers.filter(t => nameKey(teacherName(t)) === nameKey(pLabel)).length === 1;
  }
  return linked && !(pLabel && sLabel && nameKey(pLabel) !== nameKey(sLabel)) &&
    !(a && b && a !== b);
}
function sameUe(p: Lot4Plan, s: Lot4Supervision, src: HistoricalSources,
  linked: boolean): boolean {
  const a = val(p.ue_id), b = supUeId(s);
  if (a && b) return a === b;
  const pa = resolveUe(a, val(p.ue_code), val(p.ue_name), src);
  const sb = resolveUe(b, '', val(s.module), src);
  if (pa && sb) return pa === sb;
  const pLabel = val(p.ue_name || src.ues.find(u => val(u.id) === a)?.name);
  const sLabel = val(s.module || src.ues.find(u => val(u.id) === b)?.name);
  if (pLabel && sLabel && nameKey(pLabel) === nameKey(sLabel)) {
    return src.ues.filter(u => nameKey(u.name) === nameKey(pLabel)).length === 1;
  }
  return linked && !(pLabel && sLabel && nameKey(pLabel) !== nameKey(sLabel)) &&
    !(a && b && a !== b);
}
function sameClass(p: Lot4Plan, s: Lot4Supervision, src: HistoricalSources): boolean {
  const a = val(p.classe_id), b = val(s.classe_id);
  if (a && b && a !== b && src.classes.some(c => val(c.id) === a) &&
      src.classes.some(c => val(c.id) === b)) return false;
  const pLabel = planClassName(p) || val(src.classes.find(c => val(c.id) === a)?.name);
  const sLabel = supClassName(s) || val(src.classes.find(c => val(c.id) === b)?.name);
  if (a && b && a === b) return true;
  if (pLabel && sLabel && nameKey(pLabel) !== nameKey(sLabel)) return false;
  // L'absence d'ID/de libelle de classe n'est pas une condition de paiement.
  return true;
}
function isCandidate(p: Lot4Plan, s: Lot4Supervision, src: HistoricalSources): boolean {
  const pid = val(p.id), sid = val(s.id);
  if (!pid || !sid || !isCourse(p)) return false;
  const linked = val(p.supervision_id) === sid || val(s.planning_id) === pid;
  if (val(p.supervision_id) && val(p.supervision_id) !== sid) return false;
  if (val(s.planning_id) && val(s.planning_id) !== pid) return false;
  const date = pigierIso(p.date), supDate = pigierIso(s.date || s.visit_date);
  if (!date || (supDate && date !== supDate) || (!supDate && !linked)) return false;
  return sameTeacher(p, s, src, linked) && sameUe(p, s, src, linked) &&
    sameClass(p, s, src);
}
function classInfo(p: Lot4Plan, s: Lot4Supervision, src: HistoricalSources): {id: string;name: string} {
  const id = val(p.classe_id || s.classe_id);
  return { id, name: val(src.classes.find(c => val(c.id) === id)?.name) ||
    planClassName(p) || supClassName(s) };
}

/**
 * Applique les liens explicites, puis les correspondances historiques UNIQUES.
 * Les horaires ne sont jamais un veto : ils peuvent etre differents en pratique.
 * Pour des paires multiples, seul un choix humain explicite autorise l'association.
 */
export function findHistoricalMatches(
  src: HistoricalSources, manual: ReadonlyMap<string, string> = new Map(),
): HistoricalMatches {
  const candidateByPlan = new Map<string, Lot4Supervision[]>();
  const countsBySup = new Map<string, number>();
  for (const p of src.plannings) {
    const id = val(p.id);
    if (!id || !isCourse(p)) continue;
    const options = src.supervisions.filter(s => isCandidate(p, s, src));
    candidateByPlan.set(id, options);
    for (const s of options) countsBySup.set(val(s.id), (countsBySup.get(val(s.id)) || 0) + 1);
  }
  const assignments = new Map<string, Lot4Supervision>();
  const used = new Set<string>();
  // Les choix manuels, meme explicites, ne contournent pas les controles identite/date.
  for (const [pid, sid] of manual) {
    const options = candidateByPlan.get(pid) || [];
    const found = options.find(s => val(s.id) === sid);
    if (found && !used.has(sid)) { assignments.set(pid, found); used.add(sid); }
  }
  for (const [pid, options] of candidateByPlan) {
    if (assignments.has(pid) || options.length !== 1) continue;
    const only = options[0], sid = val(only.id);
    if ((countsBySup.get(sid) || 0) === 1 && !used.has(sid)) {
      assignments.set(pid, only); used.add(sid);
    }
  }
  const byPlanningId = new Map<string, HistoricalMatch>();
  for (const [pid, sup] of assignments) {
    const plan = src.plannings.find(p => val(p.id) === pid)!;
    const cls = classInfo(plan, sup, src);
    byPlanningId.set(pid, {
      planningId: pid, supervisionId: val(sup.id), supervision: sup,
      teacherId: resolveTeacher(val(plan.teacher_id) || supTeacherId(sup),
        planTeacherName(plan) || supTeacherName(sup), src),
      ueId: resolveUe(val(plan.ue_id) || supUeId(sup), val(plan.ue_code),
        val(plan.ue_name || sup.module), src),
      classId: cls.id, className: cls.name,
      actualMinutes: sessionMinutes(sup.startTime || sup.start_time, sup.endTime || sup.end_time),
    });
  }
  const ambiguousByPlanningId = new Map<string, readonly Lot4Supervision[]>();
  for (const [pid, options] of candidateByPlan) {
    if (assignments.has(pid)) continue;
    const remaining = options.filter(s => !used.has(val(s.id)));
    if (remaining.length) ambiguousByPlanningId.set(pid, remaining);
  }
  return {byPlanningId, matchedSupervisionIds: used, ambiguousByPlanningId};
}

/**
 * Le releve existant reste calcule en memoire. Aucun lien n'est ecrit en base.
 * Filtrer APRES le rapprochement garde les anciennes fiches sans IDs visibles.
 */
export function reconcileHistoricalReport(
  src: HistoricalSources, original: Lot4Document,
  matches: HistoricalMatches = findHistoricalMatches(src), filters: Lot4Filters = {},
): Lot4Document {
  const byPlan = new Map(src.plannings.filter(p => val(p.id)).map(p => [val(p.id), p]));
  const updated: Lot4Line[] = [];
  for (const line of original.lines) {
    if (line.source === 'supervision' && matches.matchedSupervisionIds.has(val(line.sourceId))) continue;
    const plan = line.source === 'planning' ? byPlan.get(val(line.planningId)) : undefined;
    if (!plan) {updated.push(line);continue;}
    const match = matches.byPlanningId.get(val(plan.id));
    const eligible = !!match && isSupervised(plan);
    const cancelled = isCancelled(plan);
    const kind = line.kind;
    const invalidKind = kind !== 'synchrone' || !isCourse(plan);
    const teacher = match?.teacherId || val(plan.teacher_id) || line.teacherId;
    const ue = match?.ueId || val(plan.ue_id) || line.ueId;
    const a = match?.supervision.startTime || match?.supervision.start_time;
    const b = match?.supervision.endTime || match?.supervision.end_time;
    const mismatch = !!match && ((clock(plan.start_time) && clock(a) && clock(plan.start_time) !== clock(a)) ||
      (clock(plan.end_time) && clock(b) && clock(plan.end_time) !== clock(b)));
    updated.push({
      ...line, teacherId: teacher, ueId: ue,
      sourceId: match?.supervisionId || '',
      teacherName: line.teacherName || 'Enseignant non renseigne',
      ueName: line.ueName || 'UE non renseignee',
      className: match?.className || line.className,
      startTime: match ? clock(a) : clock(plan.start_time),
      endTime: match ? clock(b) : clock(plan.end_time),
      durationMinutes: match?.actualMinutes ?? null,
      eligibility: cancelled || !isCourse(plan) ? 'exclu' : invalidKind ? line.eligibility : eligible ? 'eligible' : 'a_verifier',
      reason: cancelled ? 'Seance annulee' : invalidKind ? line.reason :
        !isSupervised(plan) ? 'Statut Planning non supervise' :
        !match ? 'Fiche correspondante absente ou rapprochement a confirmer' :
        mismatch ? 'Prestation attestee ; ecart horaire signale a titre informatif' :
        match.actualMinutes === null ? 'Prestation attestee ; duree realisee non renseignee' :
        'Seance supervisee avec fiche correspondante',
    });
  }
  const teacher = src.teachers.find(t => val(t.id) === val(filters.teacher));
  const ue = src.ues.find(u => val(u.id) === val(filters.ue));
  const lines = updated.filter(line => {
    const teacherMatch = !filters.teacher || val(line.teacherId) === val(filters.teacher) ||
      (!!teacher && nameKey(line.teacherName) === nameKey(teacherName(teacher)));
    const ueMatch = !filters.ue || val(line.ueId) === val(filters.ue) ||
      (!!ue && (nameKey(line.ueName) === nameKey(ue.name) || nameKey(line.ueCode) === nameKey(ue.code)));
    return teacherMatch && ueMatch && (!filters.start || line.periodEnd >= filters.start) &&
      (!filters.end || line.date <= filters.end);
  });
  const eligible = lines.filter(line => line.eligibility === 'eligible');
  const review = lines.filter(line => line.eligibility === 'a_verifier');
  const excluded = lines.filter(line => line.eligibility === 'exclu');
  const warnings: string[] = [];
  if (!filters.start || !filters.end) warnings.push('Periode de releve incomplete : preciser les bornes.');
  if (!filters.teacher) warnings.push('Aucun enseignant selectionne : vue multi-enseignants.');
  if (review.length) warnings.push(`${review.length} prestation(s) necessitent une verification.`);
  if (eligible.some(l => l.kind === 'synchrone' && l.durationMinutes === null)) {
    warnings.push('Une duree realisee est manquante ; aucun horaire prevu ne lui est substitue.');
  }
  return {
    ...original, lines, eligible, review, excluded, warnings,
    totalSyncMinutes: eligible.filter(l => l.kind === 'synchrone').reduce((n,l) => n + (l.durationMinutes || 0), 0),
    totalSyncCount: eligible.filter(l => l.kind === 'synchrone').length,
    totalAsyncCount: eligible.filter(l => l.kind === 'asynchrone').length,
    identity: {
      ...original.identity,
      teacher: teacher ? teacherName(teacher) : val(filters.teacher) || 'A renseigner',
      ue: ue ? val(ue.name) : val(filters.ue) || 'Toutes les UE',
      matricule: val(teacher?.matricule || teacher?.registration_number) || 'A renseigner',
      start: val(filters.start) || 'A renseigner', end: val(filters.end) || 'A renseigner',
    },
  };
}
