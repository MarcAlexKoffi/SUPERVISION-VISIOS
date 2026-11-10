/**
 * Adaptation en lecture seule pour la fiche officielle Pigier CI.
 * Les heures affichees viennent du Planning, les minutes effectives de la
 * fiche de supervision (jamais des horaires prevus).
 */
import {
  type Lot4Class, type Lot4Document, type Lot4Filters, type Lot4Plan,
  type Lot4Supervision, type Lot4Teacher, type Lot4Ue,
} from './lot4-documents';
import { type PigierOfficialInput, type PigierScheduleProof } from './pigier-honoraires-v2';
import {
  findHistoricalMatches, type HistoricalMatches, pigierIso, isCancelled,
} from './pigier-historical-match';

export interface PigierLot4Sources {
  teachers: readonly Lot4Teacher[];
  ues: readonly Lot4Ue[];
  classes: readonly Lot4Class[];
  plannings: readonly Lot4Plan[];
  supervisions: readonly Lot4Supervision[];
}

const clean = (value: unknown): string => String(value ?? '').trim();
const norm = (value: unknown): string => clean(value).normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');
function clock(value: unknown): string {
  const t = clean(value);
  return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(t) ? t.slice(0, 5) : '';
}
function kindOf(plan: Lot4Plan): PigierScheduleProof['kind'] {
  const type = norm(plan.session_type);
  if (clean((plan as Lot4Plan & {exam_session?: string | null}).exam_session)) return 'examination';
  if (/\b(examen|examens|evaluation|evaluations|epreuve|epreuves|composition|compositions|rattrapage|rattrapages|quiz|test)\b/.test(type)) return 'examination';
  if (/\b(asynchrone|forum)\b/.test(type)) return 'asynchronous';
  return 'synchronous';
}
function teacherLabel(teacher: Lot4Teacher): string {
  return clean(teacher.name) ||
    `${clean(teacher.first_name || teacher.firstName)} ${clean(teacher.last_name || teacher.lastName)}`.trim();
}
function uniqueTeacher(sources: PigierLot4Sources, label: string): string {
  const found = sources.teachers.filter(t => norm(teacherLabel(t)) === norm(label));
  return found.length === 1 ? clean(found[0].id) : '';
}
function uniqueUe(sources: PigierLot4Sources, code: string, name: string): string {
  const byCode = sources.ues.filter(u => !!clean(code) && norm(u.code) === norm(code));
  if (byCode.length === 1) return clean(byCode[0].id);
  const byName = sources.ues.filter(u => !!clean(name) && norm(u.name) === norm(name));
  return byName.length === 1 ? clean(byName[0].id) : '';
}
function header(sources: PigierLot4Sources, filters: Lot4Filters): Omit<PigierOfficialInput,'sessions'> {
  const teacherId = clean(filters.teacher), ueId = clean(filters.ue);
  const from = clean(filters.start), to = clean(filters.end);
  if (!teacherId || !ueId || !from || !to) {
    throw new Error('Choisissez un enseignant, une seule UE et les deux dates de la periode.');
  }
  if (from > to) throw new Error('La date de fin doit suivre la date de debut.');
  const teacher = sources.teachers.find(t => clean(t.id) === teacherId);
  const ue = sources.ues.find(u => clean(u.id) === ueId);
  if (!teacher || !ue) throw new Error('Enseignant ou UE introuvable dans les referentiels charges.');
  const firstName = clean(teacher.first_name || teacher.firstName);
  const lastName = clean(teacher.last_name || teacher.lastName);
  const fullName = clean(teacher.name) || `${firstName} ${lastName}`.trim();
  return {
    teacher: {id: teacherId, firstName, lastName, fullName,
      matricule: clean(teacher.matricule || teacher.registration_number) || null},
    ue: {id: ueId, name: clean(ue.name)}, period: {from, to},
  };
}

/** Liste des seules prestations reconnues, sans nouvelle validation administrative. */
export function buildPigierOfficialInput(
  sources: PigierLot4Sources, report: Lot4Document, filters: Lot4Filters,
  matches: HistoricalMatches = findHistoricalMatches(sources),
): PigierOfficialInput {
  const info = header(sources, filters);
  const plans = new Map(sources.plannings.filter(p => clean(p.id)).map(p => [clean(p.id), p]));
  const sessions: PigierScheduleProof[] = [];
  for (const line of report.eligible) {
    if (line.kind !== 'synchrone' || line.source !== 'planning' || !line.planningId ||
        line.teacherId !== info.teacher.id || line.ueId !== info.ue.id) continue;
    const plan = plans.get(line.planningId);
    const match = matches.byPlanningId.get(line.planningId);
    if (!plan || !match || match.supervisionId !== line.sourceId || isCancelled(plan)) continue;
    sessions.push({
      id: clean(plan.id), teacherId: info.teacher.id, ueId: info.ue.id,
      date: pigierIso(plan.date), classId: match.classId || null,
      classLabel: match.className || clean(plan.classe_name || plan.parcours),
      activityType: clean(plan.session_type), startTime: clock(plan.start_time),
      endTime: clock(plan.end_time), actualMinutes: match.actualMinutes,
      supervisionId: match.supervisionId, status: clean(plan.status), kind: kindOf(plan),
    });
  }
  return {...info, sessions};
}

/**
 * Apercu Planning : les seances non attestees peuvent etre visibles en brouillon
 * MAIS ne sont pas comptabilisees parmi les prestations effectuees.
 */
export function buildPigierPlanningDraftInput(
  sources: PigierLot4Sources, report: Lot4Document, filters: Lot4Filters,
  matches: HistoricalMatches = findHistoricalMatches(sources),
): PigierOfficialInput {
  const info = header(sources, filters);
  const certified = new Map(buildPigierOfficialInput(sources, report, filters, matches)
    .sessions.map(session => [session.id, session]));
  const classById = new Map(sources.classes.filter(c => clean(c.id)).map(c => [clean(c.id), c]));
  const sessions: PigierScheduleProof[] = [];
  for (const plan of sources.plannings) {
    const pid = clean(plan.id), date = pigierIso(plan.date);
    if (!pid || !date || date < info.period.from || date > info.period.to || isCancelled(plan)) continue;
    const match = matches.byPlanningId.get(pid);
    const teacherId = match?.teacherId || (sources.teachers.some(t => clean(t.id) === clean(plan.teacher_id)) ? clean(plan.teacher_id) : '') ||
      uniqueTeacher(sources, `${clean(plan.teacher_first_name)} ${clean(plan.teacher_last_name)}`.trim());
    const ueId = match?.ueId || (sources.ues.some(u => clean(u.id) === clean(plan.ue_id)) ? clean(plan.ue_id) : '') ||
      uniqueUe(sources, clean(plan.ue_code), clean(plan.ue_name));
    if (teacherId !== info.teacher.id || ueId !== info.ue.id) continue;
    const kind = kindOf(plan);
    if (kind !== 'synchronous') continue;
    const certifiedSession = certified.get(pid);
    const classId = match?.classId || clean(plan.classe_id);
    sessions.push({
      id: pid, teacherId, ueId, date,
      classId: classId || null,
      classLabel: certifiedSession?.classLabel || match?.className ||
        clean(classById.get(classId)?.name) || clean(plan.classe_name || plan.parcours),
      activityType: clean(plan.session_type),
      startTime: clock(plan.start_time), endTime: clock(plan.end_time),
      actualMinutes: match?.actualMinutes ?? null,
      supervisionId: match?.supervisionId || null,
      status: clean(plan.status), kind,
    });
  }
  return {...info, sessions, mode: 'draft'};
}
