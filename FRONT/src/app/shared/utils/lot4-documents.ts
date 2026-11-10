/**
 * LOT 4 - preparation commune, pure, des donnees des documents administratifs.
 * Aucune operation Firebase et aucune ecriture. Les documents sont PRELIMINAIRES
 * tant que les modeles officiels et baremes ne sont pas valides.
 */
export interface Lot4Teacher {id?:string;first_name?:string;last_name?:string;firstName?:string;lastName?:string;name?:string;email?:string;matricule?:string;registration_number?:string;status?:string}
export interface Lot4Ue {id?:string;code?:string;name?:string}
export interface Lot4Class {id?:string;name?:string}
export interface Lot4Plan {
  id?:string; date?:string; start_time?:string|null;end_time?:string|null;
  ue_id?:string|null; ue_code?:string;ue_name?:string;teacher_id?:string|null;
  teacher_first_name?:string;teacher_last_name?:string;classe_id?:string|null;classe_name?:string;
  parcours?:string;session_type?:string;status?:string;supervision_id?:string|null; title?:string;
}
export interface Lot4Supervision {
  id?:string;planning_id?:string|null;teacherId?:string|null;teacher_id?:string|null;teacherName?:string;teacher_name?:string;
  ueId?:string|null;ue_id?:string|null;module?:string;level?:string;classe?:string;classe_id?:string|null;
  date?:string;visit_date?:string;startTime?:string;endTime?:string;start_time?:string;end_time?:string;
  duration?:number;created_at?:unknown;
}
export interface Lot4AsyncSupervision {
  id?:string;teacherId?:string|null;teacher_id?:string|null;teacher_name?:string;teacherName?:string;
  ueId?:string|null;ue_id?:string|null;ue_name?:string;module?:string;week?:string;
  start_date?:string;end_date?:string;startDate?:string;endDate?:string;
  classe?:string;classe_id?:string|null;status?:string;
}
export interface Lot4Filters {teacher?:string;ue?:string;start?:string;end?:string}
export type Lot4Kind = 'synchrone'|'asynchrone'|'evaluation';
export type Lot4Eligibility = 'eligible'|'a_verifier'|'exclu';
export interface Lot4Line {
  id:string;sourceId:string;planningId:string|null;kind:Lot4Kind;eligibility:Lot4Eligibility;
  teacherId:string;teacherName:string;ueId:string;ueName:string;ueCode:string;className:string;
  date:string;periodEnd:string;startTime:string;endTime:string;durationMinutes:number|null;
  description:string;reason:string; source:'planning'|'supervision'|'async';
}
export interface Lot4Document {
  lines:Lot4Line[];eligible:Lot4Line[];review:Lot4Line[];excluded:Lot4Line[];
  totalSyncMinutes:number;totalSyncCount:number;totalAsyncCount:number;
  warnings:string[];identity:{teacher:string;matricule:string;ue:string;start:string;end:string};
}
export interface Lot4ApprovedRates {
  /** Validation explicite; sans elle aucun montant n'est calcule. */
  approved:boolean;reference:string;
  hourlyFcfa?:number;asyncFixedFcfa?:number;
  roundingMinutes:1|5|10|15|30|60;roundingMode:'none'|'nearest'|'up';
}
export interface Lot4Amount {payable:boolean;roundedMinutes:number|null;syncFcfa:number|null;asyncFcfa:number|null;totalFcfa:number|null;message:string}
const str=(x:unknown):string=>String(x??'').trim();
const normalized=(x:unknown):string=>str(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
const id=(x:unknown):string=>str(x);
const isoDate=(value:unknown):string=>{
  const text=str(value);
  let v=text;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) { const [d,m,y]=text.split('/');v=`${y}-${m}-${d}`; }
  else if (/^\d{4}-\d{2}-\d{2}T/.test(text)) v=text.slice(0,10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';
  const [yy,mm,dd]=v.split('-').map(Number);
  const dt=new Date(Date.UTC(yy,mm-1,dd));
  return dt.getUTCFullYear()===yy&&dt.getUTCMonth()===mm-1&&dt.getUTCDate()===dd?v:'';
};
const hhmm=(v:unknown):string=>{const s=str(v);return /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(s)?s.slice(0,5):'';};
/** No assumed overnight shift or rounded session-duration constant. */
export function sessionMinutes(start:unknown,end:unknown):number|null {
  const a=hhmm(start),b=hhmm(end); if (!a||!b) return null;
  const toMin=(t:string)=>Number(t.slice(0,2))*60+Number(t.slice(3,5));
  const diff=toMin(b)-toMin(a);return diff>0&&diff<=12*60?diff:null;
}
export function asyncPeriod(s:Lot4AsyncSupervision):{start:string;end:string}|null {
  let first=isoDate(s.start_date||s.startDate),last=isoDate(s.end_date||s.endDate);
  if (!first||!last) {
    const match=str(s.week).match(/(\d{2}\/\d{2}\/\d{4})\s+au\s+(\d{2}\/\d{2}\/\d{4})/i);
    if(match){first=isoDate(match[1]);last=isoDate(match[2]);}
  }
  return first&&last&&first<=last?{start:first,end:last}:null;
}
const teacherLabel=(t:Lot4Teacher):string=>str(t.name)||[t.first_name||t.firstName,t.last_name||t.lastName].filter(Boolean).join(' ').trim();
const isCancelled=(p:Lot4Plan):boolean=>normalized(p.status)==='annule';
const isExam=(p:Lot4Plan):boolean=>normalized(p.session_type)==='examen';
const isActivity=(p:Lot4Plan):boolean=>isExam(p)||(!p.ue_id&&!p.ue_code&&!!p.title);
const statusReady=(p:Lot4Plan):boolean=>normalized(p.status)==='supervise';
const asyncReady=(s:Lot4AsyncSupervision):boolean=>normalized(s.status)==='realise';
const matches=(v:string,needle:string):boolean=>!needle||normalized(v)===normalized(needle);
const inPeriod=(date:string,end:string,f:Lot4Filters):boolean=>(!f.start||end>=f.start)&&(!f.end||date<=f.end);
const sortLines=(a:Lot4Line,b:Lot4Line)=>a.date.localeCompare(b.date)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id);

export function prepareLot4(input:{
 teachers?:Lot4Teacher[];ues?:Lot4Ue[];classes?:Lot4Class[];plannings?:Lot4Plan[];
 supervisions?:Lot4Supervision[];asyncSupervisions?:Lot4AsyncSupervision[];filters?:Lot4Filters;
}):Lot4Document {
  const teachers=input.teachers||[], ues=input.ues||[], classes=input.classes||[],
    plans=input.plannings||[],sups=input.supervisions||[],asyncs=input.asyncSupervisions||[],f=input.filters||{};
  const teacherById=new Map(teachers.filter(t=>t.id).map(t=>[id(t.id),t]));
  const ueById=new Map(ues.filter(u=>u.id).map(u=>[id(u.id),u]));
  const classById=new Map(classes.filter(c=>c.id).map(c=>[id(c.id),c]));
  const plansById=new Map(plans.filter(p=>p.id).map(p=>[id(p.id),p]));
  const supByPlan=new Map<string,Lot4Supervision[]>();
  for(const s of sups){const key=id(s.planning_id);if(key)supByPlan.set(key,[...(supByPlan.get(key)||[]),s]);}
  const warnings:string[]=[];
  const lines:Lot4Line[]=[];
  const seen=new Set<string>();
  const selectedTeacher=f.teacher?teachers.find(t=>id(t.id)===f.teacher||matches(teacherLabel(t),str(f.teacher))):undefined;
  const selectedUe=f.ue?ues.find(u=>id(u.id)===f.ue||matches(str(u.name),str(f.ue))||matches(str(u.code),str(f.ue))):undefined;
  const filtered=(line:Lot4Line)=>{
    const tMatch=!f.teacher||id(line.teacherId)===f.teacher||matches(line.teacherName,str(f.teacher));
    const uMatch=!f.ue||id(line.ueId)===f.ue||matches(line.ueName,str(f.ue))||matches(line.ueCode,str(f.ue));
    return tMatch&&uMatch&&inPeriod(line.date,line.periodEnd,f);
  };
  const push=(line:Lot4Line)=>{if(seen.has(line.id))return;seen.add(line.id);if(filtered(line))lines.push(line);};

  for(const p of plans){
    if(!p.id)continue;
    const linked=supByPlan.get(p.id)||[];
    const direct=sups.find(s=>id(s.id)&&id(s.id)===id(p.supervision_id));
    const proof=linked[0]||direct;
    const date=isoDate(p.date);
    const teacher=id(p.teacher_id)||id(proof?.teacherId)||id(proof?.teacher_id);
    const ue=id(p.ue_id)||id(proof?.ueId)||id(proof?.ue_id);
    const tn=teacherLabel(teacherById.get(teacher)||{})||[p.teacher_first_name,p.teacher_last_name].filter(Boolean).join(' ').trim()||str(proof?.teacherName||proof?.teacher_name);
    const ueName=str(ueById.get(ue)?.name)||str(p.ue_name)||str(proof?.module);
    const ueCode=str(ueById.get(ue)?.code)||str(p.ue_code);
    const cls=str(classById.get(id(p.classe_id))?.name)||str(p.classe_name)||str(p.parcours)||str(proof?.level);
    const start=hhmm(proof?.startTime||proof?.start_time)||hhmm(p.start_time);
    const end=hhmm(proof?.endTime||proof?.end_time)||hhmm(p.end_time);
    const duration=sessionMinutes(start,end);
    let eligibility:Lot4Eligibility='eligible',reason='';let kind:Lot4Kind='synchrone';
    if(isCancelled(p)){eligibility='exclu';reason='Séance annulée';}
    else if(isExam(p)){eligibility='a_verifier';kind='evaluation';reason='Évaluation : barème et preuve de prestation à valider';}
    else if(isActivity(p)){eligibility='exclu';reason='Activité sans UE identifiée';}
    else if(!proof){eligibility='a_verifier';reason='Aucune fiche de supervision liée';}
    else if(!statusReady(p)){eligibility='a_verifier';reason='Statut Planning non supervisé : régularisation nécessaire';}
    else if(linked.length>1 || (direct&&linked.length&&id(direct.id)!==id(linked[0]?.id))){eligibility='a_verifier';reason='Plusieurs fiches liées à une même séance';}
    else if(!date||!start||!end||duration===null){eligibility='a_verifier';reason='Date ou horaires incomplets/incohérents';}
    else if(!teacher||!ue||!id(p.classe_id)||!cls||!teacherById.has(teacher)||!ueById.has(ue)||!classById.has(id(p.classe_id))){eligibility='a_verifier';reason='Référence enseignant, UE ou classe introuvable ou manquante';}
    if(proof && (isoDate(proof.date||proof.visit_date)||date)!==date){eligibility='a_verifier';reason='Date de la fiche différente du Planning';}
    push({id:`planning:${p.id}`,sourceId:id(proof?.id),planningId:p.id,kind,eligibility,teacherId:teacher,
      teacherName:tn||'Enseignant non renseigné',ueId:ue,ueName:ueName||'UE non renseignée',ueCode,
      className:cls||'Classe non renseignée',date,periodEnd:date,startTime:start,endTime:end,durationMinutes:duration,
      description:kind==='evaluation'?'Évaluation':str(p.session_type)||'Visioconférence',reason,source:'planning'});
  }

  // An older/orphan supervision cannot be paid automatically: its parent
  // schedule is unknown. It remains visible to an administrator for matching.
  for(const s of sups){
    if(s.planning_id&&plansById.has(id(s.planning_id)))continue;
    if(s.id && plans.some(p=>id(p.supervision_id)===id(s.id)))continue;
    const teacher=id(s.teacherId)||id(s.teacher_id),ue=id(s.ueId)||id(s.ue_id);
    const tn=teacherLabel(teacherById.get(teacher)||{})||str(s.teacherName||s.teacher_name);
    const course=str(ueById.get(ue)?.name)||str(s.module);
    const d=isoDate(s.date||s.visit_date);
    const a=hhmm(s.startTime||s.start_time),b=hhmm(s.endTime||s.end_time);
    const key=id(s.id)||[teacher,ue,d,a,b].join('/');
    push({id:`orphan:${key}`,sourceId:id(s.id),planningId:null,kind:'synchrone',eligibility:'a_verifier',
      teacherId:teacher,teacherName:tn||'Enseignant non renseigné',ueId:ue,ueName:course||'UE non renseignée',ueCode:str(ueById.get(ue)?.code),
      className:str(s.level||s.classe)||'Classe non renseignée',date:d,periodEnd:d,startTime:a,endTime:b,
      durationMinutes:sessionMinutes(a,b),description:'Fiche non rapprochée du Planning',
      reason:'Fiche historique ou isolée : rapprocher avec une séance avant paiement',source:'supervision'});
  }

  const asyncKeys=new Set<string>();
  for(const s of asyncs){
    const period=asyncPeriod(s),teacher=id(s.teacherId)||id(s.teacher_id),ue=id(s.ueId)||id(s.ue_id);
    const tn=teacherLabel(teacherById.get(teacher)||{})||str(s.teacher_name||s.teacherName);
    const course=str(ueById.get(ue)?.name)||str(s.ue_name||s.module);
    const classe=str(classById.get(id(s.classe_id))?.name)||str(s.classe)||'Classe non renseignée';
    const key=[teacher||normalized(tn),ue||normalized(course),id(s.classe_id)||normalized(classe),period?.start||'',period?.end||''].join('|');
    let eligibility:Lot4Eligibility='eligible',reason='';
    if(!asyncReady(s)){eligibility='exclu';reason='Suivi asynchrone non déclaré réalisé';}
    else if(!period){eligibility='a_verifier';reason='Période asynchrone manquante ou illisible';}
    else if(!teacher||!ue||!tn||!teacherById.has(teacher)||!ueById.has(ue)||classe==='Classe non renseignée'){eligibility='a_verifier';reason='Enseignant, UE ou classe non identifiable';}
    else if(!s.classe_id && classes.filter(c=>normalized(c.name)===normalized(classe)).length>1){eligibility='a_verifier';reason='Plusieurs classes portent le même nom';}
    else if(s.classe_id&&!classById.has(id(s.classe_id))){eligibility='a_verifier';reason='Identifiant de classe inconnu';}
    else if(asyncKeys.has(key)){eligibility='a_verifier';reason='Forfait potentiellement déjà comptabilisé pour cette période';}
    else asyncKeys.add(key);
    push({id:`async:${id(s.id)||key}`,sourceId:id(s.id),planningId:null,kind:'asynchrone',eligibility,
      teacherId:teacher,teacherName:tn||'Enseignant non renseigné',ueId:ue,ueName:course||'UE non renseignée',
      ueCode:str(ueById.get(ue)?.code),className:classe,date:period?.start||'',periodEnd:period?.end||'',
      startTime:'',endTime:'',durationMinutes:null,description:'Forfait asynchrone',reason,source:'async'});
  }

  lines.sort(sortLines);
  const eligible=lines.filter(l=>l.eligibility==='eligible');
  const review=lines.filter(l=>l.eligibility==='a_verifier');
  const excluded=lines.filter(l=>l.eligibility==='exclu');
  if(!str(f.start)||!str(f.end))warnings.push('Période de relevé incomplète : préciser les bornes avant validation.');
  if(!str(f.teacher))warnings.push('Aucun enseignant sélectionné : vue multi-enseignants, pas une fiche individuelle.');
  if(review.length)warnings.push(`${review.length} prestation(s) nécessitent une vérification avant liquidation.`);
  if(eligible.some(l=>l.kind==='synchrone'&&l.durationMinutes===null))warnings.push('Durée indisponible pour certaines prestations.');
  return {
    lines,eligible,review,excluded,
    totalSyncMinutes:eligible.filter(l=>l.kind==='synchrone').reduce((sum,l)=>sum+(l.durationMinutes||0),0),
    totalSyncCount:eligible.filter(l=>l.kind==='synchrone').length,
    totalAsyncCount:eligible.filter(l=>l.kind==='asynchrone').length,
    warnings,identity:{
      teacher:teacherLabel(selectedTeacher||{})||str(f.teacher)||'À renseigner',
      matricule:str(selectedTeacher?.matricule||selectedTeacher?.registration_number)||'À renseigner',
      ue:str(selectedUe?.name)||str(f.ue)||'Toutes les UE',start:str(f.start)||'À renseigner',end:str(f.end)||'À renseigner'
    }
  };
}

export function durationLabel(minutes:number|null):string {
  if(minutes===null||!Number.isFinite(minutes)||minutes<0)return 'À vérifier';
  return `${Math.floor(minutes/60)}h${String(minutes%60).padStart(2,'0')}`;
}
export function approvedAmounts(doc:Lot4Document,rate?:Lot4ApprovedRates):Lot4Amount {
  if(!rate?.approved || !rate.reference?.trim())return {payable:false,roundedMinutes:null,syncFcfa:null,asyncFcfa:null,totalFcfa:null,message:'Barèmes non validés : aucun montant à payer n’est calculé.'};
  const sync=doc.totalSyncCount>0,async=doc.totalAsyncCount>0;
  if(![1,5,10,15,30,60].includes(rate.roundingMinutes)||!['none','nearest','up'].includes(rate.roundingMode))return {payable:false,roundedMinutes:null,syncFcfa:null,asyncFcfa:null,totalFcfa:null,message:'Règle d’arrondi non validée.'};
  if((sync&&!(rate.hourlyFcfa!==undefined&&Number.isFinite(rate.hourlyFcfa)&&rate.hourlyFcfa>=0)) ||
    (async&&!(rate.asyncFixedFcfa!==undefined&&Number.isFinite(rate.asyncFixedFcfa)&&rate.asyncFixedFcfa>=0)))return {payable:false,roundedMinutes:null,syncFcfa:null,asyncFcfa:null,totalFcfa:null,message:'Tarif manquant pour au moins une prestation éligible.'};
  if(doc.review.length>0)return {payable:false,roundedMinutes:null,syncFcfa:null,asyncFcfa:null,totalFcfa:null,message:'Prestations à vérifier : liquidation bloquée.'};
  const m=doc.totalSyncMinutes,n=rate.roundingMinutes;
  const rounded=rate.roundingMode==='none'?m:rate.roundingMode==='up'?Math.ceil(m/n)*n:Math.round(m/n)*n;
  const syncFcfa=Math.round((rounded/60)*(rate.hourlyFcfa||0));
  const asyncFcfa=Math.round(doc.totalAsyncCount*(rate.asyncFixedFcfa||0));
  return {payable:true,roundedMinutes:rounded,syncFcfa,asyncFcfa,totalFcfa:syncFcfa+asyncFcfa,message:`Calcul préliminaire selon barème validé « ${rate.reference} » ; contrôle administratif requis.`};
}
