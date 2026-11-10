/**
 * LOT 3B – Moteur de pilotage pur, sans Firebase ni effets de bord.
 * Le planning (et les fiches de supervision liées) reste la source des séances.
 * Les objectifs manquants restent INCONNUS; jamais 0 ou 100 % par défaut.
 */
export type AcademicKitItemStatus = 'present' | 'missing' | 'incomplete' | 'unknown';
export type AcademicKitStatus = 'complet' | 'incomplet' | 'manquant' | 'a_renseigner';
export type AcademicProgressStatus = 'non_commencee' | 'en_cours' | 'terminee' | 'a_parametrer';
export type AcademicSeverity = 'critique' | 'important' | 'information';

export interface AcademicKitItem {
  key: string;
  label: string;
  required: boolean;
  status: AcademicKitItemStatus;
}
export interface AcademicExam {
  id: string;
  date: string;
  session: string;
  period?: string;
  class_id?: string;
  notes?: string;
  /** Examens du planning : source de vérité en cas de doublon exact. */
  source?: 'planning' | 'manual';
  planning_id?: string;
  start_time?: string;
  end_time?: string;
}
export interface Academic3BConfig {
  required_sessions?: number | null;
  class_ids?: string[];
  exams?: AcademicExam[];
  kit_items?: AcademicKitItem[];
  cadence_per_week?: number | null;
  target_end_date?: string;
}
export interface AcademicUe {
  id?: string; code?: string; name?: string; department?: string;
  level?: string; semester?: string | number; phase?: string | number;
  responsible?: string; responsible_id?: string | null;
  academic3b?: Academic3BConfig; academic3b_revision?: number;
}
export interface AcademicPlanning {
  id?: string; ue_id?: string | null; ue_code?: string; parcours?: string;
  classe_id?: string | null; classe_name?: string;
  date?: string; status?: string; start_time?: string | null; end_time?: string | null;
  session_type?: string; exam_session?: string | null; exam_period?: string | null;
  description?: string;
}
export interface AcademicClass {
  id?: string; name: string; parcours_id?: string | null; parcours_name?: string;
}
export interface AcademicSupervision { planning_id?: string | null; id?: string; }
export interface AcademicAlert {
  id: string; ue_id: string; class_key: string; severity: AcademicSeverity;
  code: string; title: string; detail: string;
}
export interface AcademicRow {
  id: string; ue_id: string; ue_code: string; ue_name: string;
  department: string; level: string; semester: string; phase: string;
  class_key: string; class_id: string | null; class_name: string;
  teacher_name: string; teacher_linked: boolean;
  required: number | null; completed: number; scheduledFuture: number;
  pendingLate: number; cancelled: number; documented: number;
  remaining: number | null; missingScheduled: number | null;
  progress: number | null; status: AcademicProgressStatus;
  exam: AcademicExam | null; exams: AcademicExam[];
  kit: AcademicKitStatus; kitItems: AcademicKitItem[];
  forecastDate: string | null; forecastSource: 'planned' | 'estimated' | 'completed' | 'unavailable';
  cadencePerWeek: number | null; config: Academic3BConfig;
}
export interface AcademicGroup {
  id: string; department: string; semester: string; phase: string;
  class_name: string; total: number; completed: number; inProgress: number;
  notStarted: number; unconfigured: number; progress: number | null;
  forecastDate: string | null; forecastSource: 'computed' | 'unavailable';
}
export interface AcademicBoard {
  rows: AcademicRow[]; phaseGroups: AcademicGroup[]; semesterGroups: AcademicGroup[];
  alerts: AcademicAlert[]; upcomingExams: Array<{ue_id:string; ue_name:string; class_name:string; exam: AcademicExam; remaining:number|null}>;
  stats: {total:number; completed:number; inProgress:number; notStarted:number; unconfigured:number; configured:number; criticalAlerts:number; nearExams:number};
}

export const DEFAULT_KIT_ITEMS: readonly AcademicKitItem[] = [
  {key:'plan_cours',label:'Plan de cours / syllabus',required:true,status:'unknown'},
  {key:'supports',label:'Supports pédagogiques',required:true,status:'unknown'},
  {key:'calendrier',label:'Programmation des séances',required:true,status:'unknown'},
  {key:'evaluation',label:'Modalités d’évaluation',required:true,status:'unknown'}
];
const trim = (value: unknown): string => String(value ?? '').trim();
const norm = (value: unknown): string => trim(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === value;
};
const dayMs = 86400000;
const dateMs = (date: string): number => new Date(`${date}T12:00:00Z`).getTime();
export const dateDiffDays = (from: string, to: string): number => Math.round((dateMs(to)-dateMs(from))/dayMs);
export const addIsoDays = (start: string, delta: number): string => new Date(dateMs(start)+delta*dayMs).toISOString().slice(0,10);
const later = (a: string, b: string): string => a >= b ? a : b;
const unique = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))];

/** Les documents historiques peuvent avoir une casse différente, voire une session absente. */
export function isExamPlanning(plan: AcademicPlanning): boolean {
  return norm(plan.session_type) === 'examen';
}
function isCancelledExam(plan: AcademicPlanning): boolean {return norm(plan.status)==='annule';}
function examSessionKey(session: unknown): string {
  const s=norm(session);
  if (['ordinaire','normale','session normale','session ordinaire'].includes(s)) return 'session ordinaire';
  if (['deuxieme session','2eme session','seconde session'].includes(s)) return 'deuxieme session';
  return s;
}
/** Contrôle d'un doublon exact au même jour, sans empêcher deux épreuves à des dates différentes. */
export function findDuplicateScheduledExam(candidate: AcademicPlanning, others: AcademicPlanning[]): AcademicPlanning | undefined {
  if (!isExamPlanning(candidate) || isCancelledExam(candidate) || !trim(candidate.ue_id) ||
    !trim(candidate.classe_id) || !isIsoDate(candidate.date) || !trim(candidate.exam_session)) return undefined;
  const key = JSON.stringify([trim(candidate.ue_id),trim(candidate.classe_id),candidate.date,
    examSessionKey(candidate.exam_session)]);
  return others.find(p=>p.id!==candidate.id && isExamPlanning(p) && !isCancelledExam(p) &&
    JSON.stringify([trim(p.ue_id),trim(p.classe_id),p.date,examSessionKey(p.exam_session)]) === key);
}
function examIdentity(e: AcademicExam, classId: string | null): string {
  return JSON.stringify([e.date,examSessionKey(e.session),classId || trim(e.class_id)]);
}
export function sameAcademicExam(a: AcademicExam, b: AcademicExam): boolean {
  return examIdentity(a,trim(a.class_id)||null) === examIdentity(b,trim(b.class_id)||null);
}
/** Calcul en lecture seule : les examens du Planning priment sur les fiches manuelles strictement identiques. */
function examsForAcademicRow(config: AcademicExam[], plans: AcademicPlanning[], classId: string | null): AcademicExam[] {
  const merged = new Map<string,AcademicExam>();
  for (const e of config) {
    if (e.class_id && e.class_id !== classId) continue;
    merged.set(examIdentity(e,classId),{...e,source:'manual'});
  }
  for (const p of plans) {
    if (!isExamPlanning(p) || isCancelledExam(p) || !isIsoDate(p.date)) continue;
    const e: AcademicExam = {
      id:`planning:${trim(p.id) || [p.date,p.start_time].join(':')}`,
      planning_id:trim(p.id),source:'planning',date:p.date!,
      session:trim(p.exam_session)||'Session non précisée',
      period:trim(p.exam_period),class_id:trim(p.classe_id)||classId||'',
      notes:trim(p.description),start_time:trim(p.start_time),end_time:trim(p.end_time)
    };
    merged.set(examIdentity(e,classId),e);
  }
  return [...merged.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.session.localeCompare(b.session));
}
export function normalizedConfig(input: Academic3BConfig | undefined | null): Academic3BConfig {
  const c = input || {};
  const raw: unknown = c.required_sessions;
  const required = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  const cadenceRaw: unknown = c.cadence_per_week;
  const cadence = cadenceRaw === null || cadenceRaw === undefined || cadenceRaw === '' ? null : Number(cadenceRaw);
  const exams = (Array.isArray(c.exams) ? c.exams : [])
    .filter(e => e && isIsoDate(e.date))
    .map(e => ({id:trim(e.id) || `${e.date}-${trim(e.session)}`,date:e.date,session:trim(e.session)||'Session ordinaire',
      period:trim(e.period),class_id:trim(e.class_id),notes:trim(e.notes)}));
  const kitItems = (Array.isArray(c.kit_items) ? c.kit_items : DEFAULT_KIT_ITEMS)
    .filter(i => i && trim(i.key) && trim(i.label))
    .map(i => ({key:trim(i.key),label:trim(i.label),required:i.required!==false,
      status: (['present','missing','incomplete','unknown'].includes(i.status) ? i.status : 'unknown') as AcademicKitItemStatus}));
  return {
    required_sessions: Number.isSafeInteger(required) && required! > 0 ? required : null,
    cadence_per_week: cadence && Number.isFinite(cadence) && cadence >= 0.1 && cadence <= 14 ? cadence : null,
    class_ids: unique((Array.isArray(c.class_ids) ? c.class_ids : []).map(trim)),
    exams,
    kit_items: kitItems,
    target_end_date: isIsoDate(c.target_end_date) ? c.target_end_date : undefined
  };
}
export function kitSummary(items: AcademicKitItem[]): AcademicKitStatus {
  const required = items.filter(i => i.required);
  if (!required.length) return 'a_renseigner';
  if (required.every(i => i.status === 'present')) return 'complet';
  if (required.every(i => i.status === 'missing')) return 'manquant';
  if (required.some(i => i.status === 'missing' || i.status === 'incomplete')) return 'incomplet';
  if (required.some(i => i.status === 'unknown')) return 'a_renseigner';
  return 'incomplet';
}
function groupStatus(rows: AcademicRow[], isPhase: boolean): AcademicGroup[] {
  const map = new Map<string, AcademicRow[]>();
  for (const row of rows) {
    const parts = [row.department,row.semester,isPhase?row.phase:'',row.class_key];
    const key = JSON.stringify(parts);
    map.set(key,[...(map.get(key)||[]),row]);
  }
  return [...map.entries()].map(([key, entries]): AcademicGroup=>{
    const [department,semester,phase] = JSON.parse(key) as string[];
    const total = entries.length;
    const allConfigured = entries.every(r=>r.required!==null);
    const forecastReady = entries.every(r=>r.forecastDate!==null);
    return {
      id:key,department,semester,phase,class_name:entries[0].class_name,total,
      completed:entries.filter(r=>r.status==='terminee').length,
      inProgress:entries.filter(r=>r.status==='en_cours').length,
      notStarted:entries.filter(r=>r.status==='non_commencee').length,
      unconfigured:entries.filter(r=>r.status==='a_parametrer').length,
      progress:allConfigured?Math.round(entries.reduce((sum,r)=>sum+(r.progress||0),0)/total):null,
      forecastDate:forecastReady?entries.map(r=>r.forecastDate!).sort().at(-1)!:null,
      forecastSource:forecastReady?'computed':'unavailable'
    };
  }).sort((a,b)=>a.department.localeCompare(b.department)||a.semester.localeCompare(b.semester)||a.phase.localeCompare(b.phase));
}
const pickUpcoming = (exams: AcademicExam[], classId: string | null, today: string): AcademicExam | null => exams
  .filter(e => (!e.class_id || e.class_id === classId) && e.date >= today)
  .sort((a,b)=>a.date.localeCompare(b.date))[0] || null;

export function buildAcademicBoard(data: {
  ues: AcademicUe[]; plannings: AcademicPlanning[]; classes?: AcademicClass[];
  supervisions?: AcademicSupervision[]; today: string;
}): AcademicBoard {
  if (!isIsoDate(data.today)) throw new Error('Date de référence incorrecte (AAAA-MM-JJ).');
  const {ues,plannings} = data;
  const classes = data.classes || [];
  const supervisionIds = new Set((data.supervisions || []).map(s=>trim(s.planning_id)).filter(Boolean));
  const classById = new Map(classes.filter(c=>c.id).map(c=>[String(c.id),c]));
  // Noms homonymes : ne jamais créer une relation de classe incertaine.
  const classCandidates = new Map<string, AcademicClass[]>();
  for (const c of classes) {
    const name = norm(c.name);
    classCandidates.set(name, [...(classCandidates.get(name) || []), c]);
  }
  const classByName = new Map<string,AcademicClass>();
  for (const [name,matches] of classCandidates) if (matches.length===1) classByName.set(name,matches[0]);
  const codeUes = new Map<string,string[]>();
  for (const ue of ues) {
    const code = norm(ue.code);
    if (code && ue.id) codeUes.set(code,[...(codeUes.get(code)||[]),ue.id]);
  }
  const plansByUe = new Map<string,AcademicPlanning[]>();
  for (const plan of plannings) {
    let id = trim(plan.ue_id);
    if (!id && plan.ue_code) {
      const matches = codeUes.get(norm(plan.ue_code)) || [];
      if (matches.length === 1) id = matches[0];
    }
    if (!id) continue;
    plansByUe.set(id,[...(plansByUe.get(id)||[]),plan]);
  }
  const rows: AcademicRow[]=[];
  const alerts: AcademicAlert[]=[];
  const upcomingExams: AcademicBoard['upcomingExams']=[];
  for (const ue of ues) {
    if (!ue.id) continue;
    const cfg=normalizedConfig(ue.academic3b);
    const plans=plansByUe.get(ue.id)||[];
    const classKeys=unique([
      ...(cfg.class_ids||[]).map(id=>`id:${id}`),
      ...(cfg.exams||[]).filter(e=>e.class_id).map(e=>`id:${e.class_id}`),
      ...plans.map(p=>{
        if (p.classe_id) return `id:${p.classe_id}`;
        const found=classByName.get(norm(p.classe_name||p.parcours));
        return found?.id?`id:${found.id}`:trim(p.classe_name||p.parcours)?`name:${norm(p.classe_name||p.parcours)}`:'';
      })
    ]);
    if (!classKeys.length) classKeys.push('global');
    for (const classKey of classKeys) {
      const classId=classKey.startsWith('id:')?classKey.slice(3):null;
      const classRef=classId?classById.get(classId):null;
      const className=classRef?.name || (classKey.startsWith('name:') ? plans.find(p=>norm(p.classe_name||p.parcours)===classKey.slice(5))?.classe_name || plans.find(p=>norm(p.classe_name||p.parcours)===classKey.slice(5))?.parcours : '') || (classId?'Classe non référencée':'Non affectée');
      const classPlans=plans.filter(p=>{
        if (classKey==='global') return !trim(p.classe_id) && !trim(p.classe_name||p.parcours);
        if (p.classe_id) return classKey===`id:${p.classe_id}`;
        const found=classByName.get(norm(p.classe_name||p.parcours));
        if (found?.id) return classKey===`id:${found.id}`;
        return classKey===`name:${norm(p.classe_name||p.parcours)}`;
      });
      const deduped=[...new Map(classPlans.map((p,i)=>[trim(p.id)||`anonymous-${i}`,p])).values()];
      // Les examens sont des échéances académiques, pas des séances d'enseignement.
      const teachingPlans=deduped.filter(p=>!isExamPlanning(p));
      const active=teachingPlans.filter(p=>norm(p.status)!=='annule');
      const completedPlans=active.filter(p=>norm(p.status)==='supervise' || !!(p.id && supervisionIds.has(p.id)));
      const future=active.filter(p=>p.date && isIsoDate(p.date) && p.date>=data.today && !completedPlans.includes(p)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.start_time||'').localeCompare(String(b.start_time||'')));
      const pendingLate=active.filter(p=>p.date && isIsoDate(p.date) && p.date<data.today && !completedPlans.includes(p)).length;
      const cancelled=teachingPlans.length-active.length;
      const completed=completedPlans.length;
      const required=cfg.required_sessions ?? null;
      const remaining=required===null?null:Math.max(0,required-completed);
      const missingScheduled=remaining===null?null:Math.max(0,remaining-future.length);
      const status:AcademicProgressStatus=required===null?(completed>0?'en_cours':'a_parametrer'):completed>=required?'terminee':completed===0?'non_commencee':'en_cours';
      const progress=required===null?null:Math.min(100,Math.round(completed/required*100));
      const classExams=examsForAcademicRow(cfg.exams||[],deduped,classId);
      const exam=pickUpcoming(classExams,classId,data.today);
      const kitItems=[...(cfg.kit_items||[])];
      const kit=kitSummary(kitItems);
      const teacherName=trim(ue.responsible);
      const documented=completedPlans.filter(p=>p.id && supervisionIds.has(p.id)).length;
      let forecastDate:string|null=null;
      let forecastSource:AcademicRow['forecastSource']='unavailable';
      let cadencePerWeek:number|null=cfg.cadence_per_week??null;
      if (required!==null && remaining===0) {
        forecastDate=completedPlans.map(p=>p.date||'').filter(isIsoDate).sort().at(-1)||null;
        forecastSource=forecastDate?'completed':'unavailable';
      } else if (remaining!==null && future.length>=remaining && remaining>0) {
        forecastDate=future[remaining-1].date||null;
        forecastSource=forecastDate?'planned':'unavailable';
      } else if (remaining!==null && remaining>0) {
        if (!cadencePerWeek) {
          const recent=completedPlans.filter(p=>p.date && isIsoDate(p.date) && dateDiffDays(p.date,data.today)>=0 && dateDiffDays(p.date,data.today)<=56);
          const weeks=new Set(recent.map(p=>addIsoDays(p.date!, -((new Date(`${p.date!}T12:00:00Z`).getUTCDay()+6)%7))));
          if (recent.length>=3 && weeks.size>=2) {
            const sorted=recent.map(p=>p.date!).sort();
            const periodWeeks=Math.max(2,Math.ceil((dateDiffDays(sorted[0],data.today)+1)/7));
            cadencePerWeek=Math.round(100*(recent.length/periodWeeks))/100;
          }
        }
        if (cadencePerWeek) {
          const baseline=future.length ? later(data.today,future.at(-1)?.date||data.today) : data.today;
          forecastDate=addIsoDays(baseline,Math.ceil((remaining-future.length)/cadencePerWeek)*7);
          forecastSource='estimated';
        }
      }
      const row:AcademicRow={
        id:`${ue.id}|${classKey}`,ue_id:ue.id,ue_code:trim(ue.code),ue_name:trim(ue.name),
        department:trim(ue.department)||'Non renseigné',level:trim(ue.level)||'—',
        semester:trim(ue.semester)||'Non renseigné',phase:trim(ue.phase)||'Non renseignée',
        class_key:classKey,class_id:classId,class_name:className,
        teacher_name:teacherName,teacher_linked:!!trim(ue.responsible_id),
        required,completed,scheduledFuture:future.length,pendingLate,cancelled,documented,
        remaining,missingScheduled,progress,status,exam,exams:classExams,kit,kitItems,
        forecastDate,forecastSource,cadencePerWeek,config:cfg
      };
      rows.push(row);
      const warn=(code:string,severity:AcademicSeverity,title:string,detail:string) => {
        alerts.push({id:`${row.id}:${code}`,ue_id:ue.id!,class_key:classKey,severity,code,title,detail});
      };
      if (!teacherName && !trim(ue.responsible_id)) warn('NO_TEACHER','important','UE sans enseignant','Aucun responsable déclaré pour cette UE.');
      else if (!trim(ue.responsible_id)) warn('LEGACY_TEACHER','information','Lien enseignant à confirmer','Nom historique présent, mais aucun identifiant enseignant stable.');
      if (required===null) warn('MISSING_TARGET','information','Objectif de séances absent','Renseigner le nombre de séances attendues pour obtenir une progression fiable.');
      if (classKey==='global') warn('NO_CLASS','information','UE sans classe liée','Associer au moins une classe ou programmer une séance pour cette UE.');
      if (required!==null && remaining !== null && remaining > 0 && future.length===0) warn('UNPROGRAMMED','important','Séances non programmées',`${remaining} séance(s) restante(s), aucune future programmation.`);
      if (missingScheduled!==null && missingScheduled>0 && future.length>0) warn('NOT_ENOUGH','important','Nombre de séances insuffisant',`${missingScheduled} séance(s) restante(s) sans programmation future.`);
      if (pendingLate>0) warn('LATE','important','Supervision en retard',`${pendingLate} séance(s) passée(s) sans statut supervisé ni fiche liée.`);
      const oldestPending=active.filter(p=>p.date && isIsoDate(p.date) && p.date<data.today && !completedPlans.includes(p)).map(p=>p.date!).sort()[0];
      if (oldestPending && dateDiffDays(oldestPending,data.today)>14) warn('MAJOR_DELAY','important','Retard académique important',`Au moins une séance attend depuis ${dateDiffDays(oldestPending,data.today)} jours.`);
      if (kit==='manquant') warn('KIT_MISSING','important','Kit de démarrage manquant','Tous les éléments obligatoires ont été explicitement marqués absents.');
      if (kit==='incomplet') warn('KIT_INCOMPLETE','important','Kit de démarrage incomplet','Certains éléments requis ne sont pas présents.');
      if (kit==='a_renseigner') warn('KIT_UNKNOWN','information','Kit à vérifier','Présence des éléments du kit non entièrement évaluée.');
      // Aucun rapprochement arbitraire si une date manuelle et une date Planning diffèrent.
      if (classExams.some(e=>e.source==='manual' && classExams.some(p=>
        p.source==='planning' && p.date!==e.date &&
        examSessionKey(p.session)===examSessionKey(e.session) && norm(p.period)===norm(e.period)))) {
        warn('EXAM_SOURCE_MISMATCH','important','Dates d’examen à rapprocher',
          'Le Planning et les dates saisies manuellement mentionnent la même session avec des échéances différentes. Vérifiez avant de retirer une date.');
      }
      if (remaining!==0 && classExams.some(e=>e.date<data.today && dateDiffDays(e.date,data.today)<=30)) {
        warn('EXAM_PASSED','critique','Examen passé et UE incomplète','Une date d’examen est passée dans les 30 derniers jours sans achèvement attesté.');
      }
      if (remaining!==0 && cfg.target_end_date && isIsoDate(cfg.target_end_date)) {
        if (cfg.target_end_date < data.today) warn('DEADLINE_MISSED','important','Échéance de fin dépassée',`Date cible ${cfg.target_end_date} dépassée.`);
        else if (forecastDate && forecastDate>cfg.target_end_date) warn('TARGET_RISK','important','Fin prévue après la date cible',`Fin prévue ${forecastDate}, cible ${cfg.target_end_date}.`);
      }
      if (exam && remaining!==0) {
        const days=dateDiffDays(data.today,exam.date);
        if (days<=14) warn('EXAM_RISK','critique','Examen proche et cours incomplet',`Examen dans ${days} jour(s) ; ${remaining===null?'objectif non renseigné':`${remaining} séance(s) restante(s)`}.`);
        if (forecastDate && forecastDate>exam.date) warn('EXAM_AFTER_FORECAST','critique','Fin prévisionnelle après l’examen',`Fin ${forecastDate}, examen ${exam.date}.`);
      }
      for (const e of classExams) if (e.date>=data.today && dateDiffDays(data.today,e.date)<=30) {
        upcomingExams.push({ue_id:ue.id,ue_name:trim(ue.name),class_name:className,exam:e,remaining});
      }
    }
  }
  const priority:Record<AcademicSeverity,number>={critique:0,important:1,information:2};
  alerts.sort((a,b)=>priority[a.severity]-priority[b.severity]||a.title.localeCompare(b.title));
  upcomingExams.sort((a,b)=>a.exam.date.localeCompare(b.exam.date)||a.ue_name.localeCompare(b.ue_name));
  const stats={total:rows.length,completed:rows.filter(r=>r.status==='terminee').length,
    inProgress:rows.filter(r=>r.status==='en_cours').length,
    notStarted:rows.filter(r=>r.status==='non_commencee').length,
    unconfigured:rows.filter(r=>r.status==='a_parametrer').length,
    configured:rows.filter(r=>r.required!==null).length,
    criticalAlerts:alerts.filter(a=>a.severity==='critique').length,nearExams:upcomingExams.filter(e=>dateDiffDays(data.today,e.exam.date)<=14).length};
  return {rows,phaseGroups:groupStatus(rows,true),semesterGroups:groupStatus(rows,false),alerts,upcomingExams,stats};
}
