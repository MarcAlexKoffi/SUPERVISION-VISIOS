import { Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';
import { Slot, PlanningError, slotValidation, slotOf, assertNoConflict, combined, moved } from '../utils/planningLot3';

/** Keep class name (parcours) for legacy compatibility and add stable class/parcours IDs. */
async function hydrate(data: any, previous?: any): Promise<any> {
  const out = {...data};
  if (out.parcours && (!out.classe_id || out.parcours !== previous?.parcours)) {
    const matches=await db.collection('classes').where('name','==',out.parcours).get();
    if (matches.size === 1) {
      out.classe_id=matches.docs[0].id;
      out.classe_name=matches.docs[0].data().name;
      out.parcours_id=matches.docs[0].data().parcours_id || null;
    } else if (matches.size > 1 && !out.classe_id) throw new PlanningError(400,'Classe ambiguë.');
    else if (matches.empty && !previous) throw new PlanningError(400,'Classe introuvable.');
  }
  if (out.classe_id && (!previous || previous.classe_id !== out.classe_id)) {
    const snap=await db.collection('classes').doc(out.classe_id).get();
    if (!snap.exists) throw new PlanningError(400,'Classe inconnue.');
    out.classe_name=snap.data()?.name;
    out.parcours=out.classe_name;
    out.parcours_id=snap.data()?.parcours_id || null;
  }
  if (out.ue_id && (!previous || previous.ue_id!==out.ue_id || !previous.ue_code)) {
    const snap=await db.collection('ues').doc(out.ue_id).get();
    if (!snap.exists) throw new PlanningError(400,'UE inconnue.');
    out.ue_code=snap.data()?.code;
    out.ue_name=snap.data()?.name;
  } else if (out.ue_id === null) {out.ue_code='';out.ue_name='';}
  if (out.teacher_id && (!previous || previous.teacher_id!==out.teacher_id || !previous.teacher_first_name)) {
    const snap=await db.collection('teachers').doc(out.teacher_id).get();
    if (!snap.exists) throw new PlanningError(400,'Enseignant inconnu.');
    out.teacher_first_name=snap.data()?.first_name || snap.data()?.firstName || '';
    out.teacher_last_name=snap.data()?.last_name || snap.data()?.lastName || '';
    out.teacher_email=snap.data()?.email || '';
  }
  return out;
}
function clean(body:any):any {
  const {id: _id,ue: _ue,teacher: _teacher,change_reason:_reason,...rest}=body || {};
  return Object.fromEntries(Object.entries(rest).filter(([,value])=>value!==undefined));
}
function report(res: Response,error:any):void {
  if (!(error instanceof PlanningError)) console.error('Planning Lot 3:',error);
  res.status(error instanceof PlanningError ? error.code : 500).json({message:error.message || 'Erreur de planning.'});
}

export const createPlanning = async (req:AuthRequest,res:Response) => {
  try {
    const data=await hydrate(clean(req.body));
    if (!data.ue_id && !data.title) throw new PlanningError(400,'UE ou titre obligatoire.');
    const record={...data,status:data.status || 'À superviser',created_at:new Date(),updated_at:new Date()};
    const invalid=slotValidation(record);
    if (invalid) throw new PlanningError(400,invalid);
    const ref=db.collection('plannings').doc();
    const lock=db.collection('planning_day_locks').doc(record.date);
    await db.runTransaction(async t => {
      const daySnapshot=await t.get(db.collection('plannings').where('date','==',record.date));
      const lockSnapshot=await t.get(lock);
      const entries=(lockSnapshot.data()?.entries || {}) as Record<string,Slot>;
      assertNoConflict({...record,id:ref.id},combined(daySnapshot.docs.map(d=>({id:d.id,...d.data()} as Slot)),entries));
      t.create(ref,record);
      t.set(lock,{entries:{...entries,[ref.id]:slotOf({...record,id:ref.id})},version:(lockSnapshot.data()?.version || 0)+1});
    });
    return res.status(201).json({message:'Séance planifiée',id:ref.id});
  } catch(error:any) {report(res,error);}
};

export const getPlannings = async (req:AuthRequest,res:Response) => {
  try {
    const {parcours,startDate,endDate,status} = req.query;
    let q:FirebaseFirestore.Query=db.collection('plannings');
    if(startDate) q=q.where('date','>=',startDate);
    if(endDate) q=q.where('date','<=',endDate);
    if (!startDate && !endDate && parcours) q=q.where('parcours','==',parcours);
    const snapshot=await q.limit(1000).get();
    const rows=snapshot.docs.map(d=>({id:d.id,...d.data()})).filter((p:any)=>
      (!parcours || p.parcours===parcours || p.classe_id===parcours) && (!status || p.status===status)) as any[];
    rows.sort((a,b)=>`${a.date||''} ${a.start_time||''}`.localeCompare(`${b.date||''} ${b.start_time||''}`));
    return res.json(rows);
  } catch(error:any) {report(res,error);}
};

export const updatePlanning = async(req:AuthRequest,res:Response) => {
  try {
    const ref=db.collection('plannings').doc(req.params.id);
    const preliminary=await ref.get();
    if (!preliminary.exists) throw new PlanningError(404,'Séance introuvable.');
    const previous={id:ref.id,...preliminary.data()} as any;
    const patch=await hydrate(clean(req.body),previous);
    const candidate={...previous,...patch,id:ref.id};
    if (candidate.supervision_id && (moved(previous,candidate) || candidate.status==='Annulé'))
      throw new PlanningError(409,'Séance déjà supervisée : report ou annulation impossible.');
    const statusOnly=Object.keys(clean(req.body)).every(k=>['status','updated_at'].includes(k));
    const invalid=slotValidation(candidate);
    if (invalid && !(statusOnly && !previous.start_time)) throw new PlanningError(400,invalid);
    const dates=[...new Set([previous.date,candidate.date])].sort() as string[];
    const locks=dates.map(date=>db.collection('planning_day_locks').doc(date));
    const reason=String(req.body.change_reason || '').trim();
    await db.runTransaction(async t=>{
      const fresh=await t.get(ref);
      if(!fresh.exists) throw new PlanningError(404,'Séance supprimée entre-temps.');
      const actual={id:ref.id,...fresh.data()} as Slot;
      if(JSON.stringify(slotOf(actual))!==JSON.stringify(slotOf(previous)))
        throw new PlanningError(409,'La séance a été modifiée. Rechargez la page.');
      const daySnapshot=await t.get(db.collection('plannings').where('date','==',candidate.date));
      const lockDocs=await Promise.all(locks.map(lock=>t.get(lock)));
      const entries:Record<string,Record<string,Slot>>={};
      dates.forEach((date,i)=>entries[date]={...(lockDocs[i].data()?.entries || {})});
      assertNoConflict(candidate,combined(daySnapshot.docs.map(d=>({id:d.id,...d.data()} as Slot)),entries[candidate.date]));
      const changes:any={...patch,updated_at:new Date()};
      if (moved(previous,candidate)) changes.reschedule_history=[...(previous.reschedule_history || []),{
        at:new Date().toISOString(),from:{date:previous.date,start_time:previous.start_time,end_time:previous.end_time},
        to:{date:candidate.date,start_time:candidate.start_time,end_time:candidate.end_time},reason
      }];
      if (previous.status!==candidate.status) changes.status_history=[...(previous.status_history || []),{
        at:new Date().toISOString(),from:previous.status,to:candidate.status,reason
      }];
      t.update(ref,changes);
      if(previous.date!==candidate.date) delete entries[previous.date][ref.id];
      entries[candidate.date][ref.id]=slotOf(candidate);
      locks.forEach((lock,i)=>t.set(lock,{entries:entries[dates[i]],version:(lockDocs[i].data()?.version || 0)+1}));
    });
    return res.json({message:'Séance mise à jour',id:ref.id});
  } catch(error:any) {report(res,error);}
};

export const deletePlanning = async(req:AuthRequest,res:Response) => {
  try {
    const ref=db.collection('plannings').doc(req.params.id);
    const preliminary=await ref.get();
    if(!preliminary.exists) throw new PlanningError(404,'Séance introuvable.');
    const day=preliminary.data()?.date;
    if(!day) throw new PlanningError(400,'La séance ne possède pas de date.');
    const lock=db.collection('planning_day_locks').doc(day);
    await db.runTransaction(async t=>{
      const planning=await t.get(ref);
      const guard=await t.get(lock);
      if(!planning.exists) throw new PlanningError(404,'Séance introuvable.');
      if(planning.data()?.date!==day) throw new PlanningError(409,'Séance déplacée. Actualisez.');
      if(planning.data()?.supervision_id) throw new PlanningError(409,'Une fiche de supervision est liée à cette séance.');
      const entries={...(guard.data()?.entries || {})}; delete entries[ref.id];
      t.delete(ref);
      t.set(lock,{entries,version:(guard.data()?.version || 0)+1});
    });
    return res.json({message:'Séance supprimée.'});
  } catch(error:any) {report(res,error);}
};
