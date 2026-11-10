import { Injectable, inject } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, getDoc, getDocs, query, where, orderBy,
  runTransaction
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { firstConflict, isRescheduled, ScheduleSlot, SessionStatus, validateSlot } from './planning-rules';
import { findDuplicateScheduledExam, isExamPlanning } from '../shared/utils/academic-3b';

export interface Planning extends ScheduleSlot {
  id?: string;
  parcours: string; // Legacy field containing the class NAME. Never remove it.
  classe_id?: string | null;
  classe_name?: string;
  parcours_id?: string | null;
  ue_id?: string | null;
  teacher_id?: string | null;
  title?: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time: string;
  session_type: string;
  /** Exam-specific metadata; non-exam activities leave these null. */
  exam_session?: string | null;
  exam_period?: string | null;
  platform: string;
  visio_link: string;
  status: SessionStatus;
  ue_code?: string;
  ue_name?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  teacher_email?: string;
  supervision_id?: string;
  reschedule_history?: Array<{ at: string; from: { date: string; start_time?: string; end_time: string }; to: { date: string; start_time?: string; end_time: string }; reason: string }>;
  status_history?: Array<{ at: string; from: string; to: string; reason: string }>;
  ue?: { code: string; name: string };
  teacher?: { first_name: string; last_name: string; email: string };
}

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private firestore = inject(Firestore);

  getPlannings(filters?: { parcours?: string; startDate?: string; endDate?: string; status?: string }): Observable<Planning[]> {
    const colRef = collection(this.firestore, 'plannings');
    const constraints: any[] = [orderBy('date', 'desc')];
    if (filters?.startDate) constraints.push(where('date', '>=', filters.startDate));
    if (filters?.endDate) constraints.push(where('date', '<=', filters.endDate));
    return (collectionData(query(colRef, ...constraints), { idField: 'id' }) as Observable<Planning[]>).pipe(
      map(rows => rows.filter(p => (!filters?.parcours || p.parcours === filters.parcours || p.classe_id === filters.parcours) &&
        (!filters?.status || p.status === filters.status)).map(p => ({
          ...p,
          ue: p.ue_code ? { code: p.ue_code, name: p.ue_name || '' } : undefined,
          teacher: p.teacher_first_name ? {first_name:p.teacher_first_name, last_name:p.teacher_last_name || '', email:p.teacher_email || ''} : undefined
        })))
    );
  }

  getById(id: string): Observable<Planning | null> {
    return from(getDoc(doc(this.firestore, 'plannings', id)).then(s => s.exists() ? { id:s.id, ...s.data() } as Planning : null));
  }

  /** Names remain available for historical documents; all newly saved relations use stable IDs. */
  private async withRelations(fields: Partial<Planning>, previous?: Planning): Promise<Partial<Planning>> {
    const result = {...fields};
    if (result.parcours && (!result.classe_id || result.parcours !== previous?.parcours)) {
      const matches = await getDocs(query(collection(this.firestore, 'classes'), where('name', '==', result.parcours)));
      if (matches.size === 1) {
        const cls = matches.docs[0];
        result.classe_id = cls.id;
        result.classe_name = cls.data()['name'];
        result.parcours_id = cls.data()['parcours_id'] || null;
      } else if (matches.size > 1 && !result.classe_id) {
        throw new Error('Plusieurs classes portent ce nom : sélectionnez une classe identifiable.');
      } else if (matches.empty && !previous) {
        throw new Error('Classe introuvable. Veuillez actualiser la liste des classes.');
      }
    }
    if (result.classe_id && (!previous || previous.classe_id !== result.classe_id)) {
      const cls = await getDoc(doc(this.firestore, 'classes', result.classe_id));
      if (!cls.exists()) throw new Error('Classe inconnue.');
      result.classe_name = cls.data()['name'];
      result.parcours = cls.data()['name'];
      result.parcours_id = cls.data()['parcours_id'] || null;
    }
    if (result.ue_id && (!previous || previous.ue_id !== result.ue_id || !previous.ue_code)) {
      const ue = await getDoc(doc(this.firestore, 'ues', result.ue_id));
      if (!ue.exists()) throw new Error('UE inconnue.');
      result.ue_code = ue.data()['code'];
      result.ue_name = ue.data()['name'];
    } else if (result.ue_id === null) {
      result.ue_code = '';
      result.ue_name = '';
    }
    if (result.teacher_id && (!previous || previous.teacher_id !== result.teacher_id || !previous.teacher_first_name)) {
      const teacher = await getDoc(doc(this.firestore, 'teachers', result.teacher_id));
      if (!teacher.exists()) throw new Error('Enseignant inconnu.');
      result.teacher_first_name = teacher.data()['first_name'] || teacher.data()['firstName'] || '';
      result.teacher_last_name = teacher.data()['last_name'] || teacher.data()['lastName'] || '';
      result.teacher_email = teacher.data()['email'] || '';
    }
    return result;
  }

  private sanitize(input: Partial<Planning> & { change_reason?: string }): Partial<Planning> {
    const { id: _id, ue: _ue, teacher: _teacher, change_reason: _reason, ...safe } = input;
    return Object.fromEntries(Object.entries(safe).filter(([, v]) => v !== undefined)) as Partial<Planning>;
  }

  private async onDate(date: string): Promise<Planning[]> {
    const q = query(collection(this.firestore, 'plannings'), where('date', '==', date));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(s => ({...s.data(), id:s.id} as Planning));
  }

  private combined(existing: Planning[], lockEntries: Record<string, ScheduleSlot>): ScheduleSlot[] {
    const byId = new Map(existing.map(p => [p.id!, p as ScheduleSlot]));
    Object.entries(lockEntries).forEach(([id, value]) => byId.set(id, {...value, id}));
    return [...byId.values()];
  }

  private check(candidate: Planning, others: ScheduleSlot[], legacyOnly = false): void {
    const error = validateSlot(candidate);
    // Status-only edits may still be needed for legacy records without start_time.
    if (error && !legacyOnly) throw new Error(error);
    if (isExamPlanning(candidate)) {
      if (!candidate.ue_id || !candidate.classe_id || !candidate.exam_session?.trim()) {
        throw new Error('Un examen exige une UE, une classe identifiée et une session.');
      }
      const duplicate = findDuplicateScheduledExam(
        candidate,
        others.map((slot) => ({ ...slot, parcours: slot.parcours ?? undefined }))
      );
      if (duplicate) throw new Error('Cet examen est déjà programmé pour cette UE, classe, date et session.');
    }
    const conflict = firstConflict(candidate, others);
    if (conflict) {
      const person = conflict.teacher_id === candidate.teacher_id ? 'enseignant' : 'classe';
      throw new Error(`Conflit horaire (${person}) le ${candidate.date}, de ${conflict.start_time} à ${conflict.end_time}.`);
    }
  }

  create(planning: Partial<Planning>): Observable<{id: string}> {
    return from(this.createAtomic(planning));
  }

  private async createAtomic(input: Partial<Planning>): Promise<{id:string}> {
    const prepared = await this.withRelations(this.sanitize(input));
    const entity = { ...prepared, status: prepared.status || 'À superviser' } as Planning;
    if (!entity.ue_id && !entity.title?.trim()) throw new Error('UE ou titre obligatoire.');
    this.check(entity, []);
    const sameDay = await this.onDate(entity.date);
    const ref = doc(collection(this.firestore, 'plannings'));
    const guardRef = doc(this.firestore, 'planning_day_locks', entity.date);
    await runTransaction(this.firestore, async t => {
      const lock = await t.get(guardRef);
      const entries = (lock.data()?.['entries'] || {}) as Record<string, ScheduleSlot>;
      this.check({...entity, id:ref.id}, this.combined(sameDay, entries));
      t.set(ref, this.safeFirestoreValue({ ...entity, created_at: new Date(), updated_at: new Date() }));
      t.set(guardRef, this.safeFirestoreValue({ entries: { ...entries, [ref.id]:this.slotOf({...entity,id:ref.id}) }, version:(lock.data()?.['version'] || 0)+1 }));
    });
    return {id:ref.id};
  }

  update(id: string, input: Partial<Planning> & { change_reason?: string }): Observable<void> {
    return from(this.updateAtomic(id, input));
  }

  /**
   * Firestore refuse les valeurs undefined, notamment dans les anciens slots
   * sans classe_id/start_time. Ne pas supprimer les null explicites.
   * Copie profonde des seuls objets ordinaires; conserve Date/Timestamp/intents.
   */
  private safeFirestoreValue<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map(v => v === undefined ? null : this.safeFirestoreValue(v)) as T;
    }
    if (value && typeof value === 'object') {
      const proto = Object.getPrototypeOf(value);
      if (proto === null || Object.getPrototypeOf(proto) === null) {
        return Object.fromEntries(
          Object.entries(value).filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, this.safeFirestoreValue(v)])
        ) as T;
      }
    }
    return value;
  }

  private slotOf(p: Planning): ScheduleSlot {
    return this.safeFirestoreValue({
      id:p.id,date:p.date,start_time:p.start_time,end_time:p.end_time,
      teacher_id:p.teacher_id,classe_id:p.classe_id,parcours:p.parcours,status:p.status,
      ...(isExamPlanning(p) ? {
        ue_id:p.ue_id,session_type:p.session_type,exam_session:p.exam_session,exam_period:p.exam_period
      } : {})
    });
  }

  private async updateAtomic(id: string, input: Partial<Planning> & { change_reason?: string }): Promise<void> {
    const planRef = doc(this.firestore, 'plannings', id);
    const preliminary = await getDoc(planRef);
    if (!preliminary.exists()) throw new Error('Séance introuvable.');
    const before = {id,...preliminary.data()} as Planning;
    const patch = await this.withRelations(this.sanitize(input), before);
    const candidate = { ...before, ...patch, id } as Planning;
    const isOnlyStatus = Object.keys(this.sanitize(input)).every(k => ['status','updated_at'].includes(k));
    if (candidate.supervision_id && (isRescheduled(before,candidate) || candidate.status === 'Annulé')) {
      throw new Error('Cette séance possède une fiche de supervision. Son horaire ou son annulation nécessitent un traitement administratif.');
    }
    this.check(candidate, [], isOnlyStatus && !before.start_time);
    const days = [...new Set([before.date, candidate.date])].sort();
    const rows = await this.onDate(candidate.date);
    const guards = days.map(day => doc(this.firestore, 'planning_day_locks', day));
    const reason = (input.change_reason || '').trim();
    await runTransaction(this.firestore, async t => {
      const planSnap = await t.get(planRef);
      if (!planSnap.exists()) throw new Error('Séance supprimée par un autre utilisateur.');
      const actual = {id,...planSnap.data()} as Planning;
      if (JSON.stringify(this.slotOf(actual)) !== JSON.stringify(this.slotOf(before))) {
        throw new Error('Séance modifiée par un autre utilisateur. Actualisez et réessayez.');
      }
      const locks = await Promise.all(guards.map(g=>t.get(g)));
      const byDate: Record<string,Record<string, ScheduleSlot>> = {};
      days.forEach((day,idx)=>byDate[day] = {...(locks[idx].data()?.['entries'] || {})});
      this.check(candidate, this.combined(rows, byDate[candidate.date]), isOnlyStatus && !before.start_time);
      if (isRescheduled(before,candidate)) {
        candidate.reschedule_history = [...(before.reschedule_history || []), {
          at:new Date().toISOString(), from:{date:before.date,start_time:before.start_time,end_time:before.end_time},
          to:{date:candidate.date,start_time:candidate.start_time,end_time:candidate.end_time}, reason
        }];
      }
      if (candidate.status !== before.status) {
        candidate.status_history = [...(before.status_history || []), {
          at:new Date().toISOString(), from:before.status ?? 'Non renseigné', to:candidate.status, reason
        }];
      }
      t.update(planRef, this.safeFirestoreValue({...patch,
        ...(candidate.reschedule_history ? {reschedule_history:candidate.reschedule_history}:{}),
        ...(candidate.status_history ? {status_history:candidate.status_history}:{}),
        updated_at: new Date()
      }));
      if (before.date !== candidate.date) delete byDate[before.date][id];
      byDate[candidate.date][id] = this.slotOf(candidate);
      guards.forEach((g,idx) => t.set(g, this.safeFirestoreValue({entries:byDate[days[idx]],version:(locks[idx].data()?.['version'] || 0)+1})));
    });
  }

  delete(id: string): Observable<void> {
    return from(this.deleteAtomic(id));
  }
  private async deleteAtomic(id:string):Promise<void> {
    const ref = doc(this.firestore, 'plannings', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Séance introuvable.');
    const day = snap.data()['date'];
    if (!day) throw new Error('Séance sans date : suppression manuelle requise.');
    const guard = doc(this.firestore, 'planning_day_locks', day);
    await runTransaction(this.firestore, async t => {
      const actual = await t.get(ref);
      const lock = await t.get(guard);
      if (!actual.exists()) throw new Error('Séance introuvable.');
      if (actual.data()['date'] !== day) throw new Error('La séance a été déplacée. Actualisez.');
      if (actual.data()['supervision_id']) throw new Error('Séance supervisée : suppression interdite pour conserver la fiche.');
      const entries = {...(lock.data()?.['entries'] || {})};
      delete entries[id];
      t.delete(ref);
      t.set(guard, this.safeFirestoreValue({entries, version:(lock.data()?.['version'] || 0)+1}));
    });
  }

  createPlanning(p:Partial<Planning>):Observable<{id:string}>{return this.create(p);}
  updatePlanning(id:string,p:Partial<Planning> & {change_reason?:string}):Observable<void>{return this.update(id,p);}
  deletePlanning(id:string):Observable<void>{return this.delete(id);}
}
