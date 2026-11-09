
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy, where, getDocs, getDoc, runTransaction } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { planningFingerprint } from './planning-rules';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  private allCache$?: Observable<any[]>;
  private userCache$: { [userId: string]: Observable<any[]> } = {};

  constructor() { }

  getByPlanningId(planningId: string): Observable<any | null> {
    const q = query(collection(this.firestore, 'supervisions'), where('planning_id', '==', planningId));
    return from(getDocs(q).then(snapshot => snapshot.empty ? null : {
      id: snapshot.docs[0].id, ...snapshot.docs[0].data()
    }));
  }

  create(data: any): Observable<any> {
    const user = this.authService.currentUserValue;
    const {planning_slot_fingerprint: expectedFingerprint, ...formFields} = data;
    const newData = {
        ...formFields,
        user_id: user ? user.uid : null,
        created_at: new Date()
    };
    const colRef = collection(this.firestore, 'supervisions');
    if (!newData.planning_id) return from(addDoc(colRef, newData));
    const supervisionRef = doc(colRef);
    const planningRef = doc(this.firestore, 'plannings', newData.planning_id);
    // An atomic association prevents two supervisors from creating duplicate linked forms.
    return from(runTransaction(this.firestore, async tx => {
      const planning = await tx.get(planningRef);
      if (!planning.exists()) throw new Error('La séance du planning est introuvable.');
      if (planning.data()['status'] === 'Annulé') throw new Error('Une séance annulée ne peut pas être supervisée.');
      if (expectedFingerprint && planningFingerprint(planning.data() as any) !== expectedFingerprint) {
        throw new Error('La séance a été reprogrammée depuis l’ouverture de la fiche. Rechargez-la avant de continuer.');
      }
      if (planning.data()['supervision_id']) throw new Error('Une fiche de supervision existe déjà pour cette séance.');
      tx.set(supervisionRef, newData);
      tx.update(planningRef, {supervision_id:supervisionRef.id,status:'Supervisé',updated_at:new Date()});
      return {id:supervisionRef.id};
    }));
  }

  update(id: string, data: any): Observable<void> {
    const docRef = doc(this.firestore, `supervisions/${id}`);
    return from(updateDoc(docRef, data));
  }

  getAll(userId?: string): Observable<any[]> {
    const colRef = collection(this.firestore, 'supervisions');

    if (userId) {
      if (!this.userCache$[userId]) {
        const q = query(colRef, where('user_id', '==', userId));
        this.userCache$[userId] = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(data => {
            return data.sort((a, b) => {
              const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
              const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
              return dateB - dateA;
            });
          }),
          shareReplay(1)
        );
      }
      return this.userCache$[userId]!;
    } else {
      if (!this.allCache$) {
        const q = query(colRef, orderBy('created_at', 'desc'));
        this.allCache$ = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(data => {
            return data.sort((a, b) => {
              const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
              const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
              return dateB - dateA;
            });
          }),
          shareReplay(1)
        );
      }
      return this.allCache$!;
    }
  }

  getById(id: string): Observable<any> {
      const docRef = doc(this.firestore, `supervisions/${id}`);
      return docData(docRef, { idField: 'id' });
  }

  delete(id: string): Observable<void> {
    const supervisionRef = doc(this.firestore, 'supervisions', id);
    return from((async () => {
      const snapshot = await getDoc(supervisionRef);
      if (!snapshot.exists()) throw new Error('Fiche introuvable.');
      const planId = snapshot.data()['planning_id'];
      if (!planId) {await deleteDoc(supervisionRef); return;}
      const planningRef = doc(this.firestore, 'plannings', planId);
      await runTransaction(this.firestore, async tx => {
        const supervision = await tx.get(supervisionRef);
        const planning = await tx.get(planningRef);
        if (!supervision.exists()) throw new Error('Fiche déjà supprimée.');
        if (supervision.data()['planning_id'] !== planId) throw new Error('Fiche modifiée. Actualisez.');
        if (planning.exists() && planning.data()['supervision_id'] === id) {
          tx.update(planningRef, {supervision_id:null,status:'À superviser',updated_at:new Date()});
        }
        tx.delete(supervisionRef);
      });
    })());
  }

  sendReport(id: string, data: { pdfBase64: string, teacherEmail: string, subject?: string, message?: string }): Observable<any> {
    // This requires a Cloud Function as it involves sending emails securely.
    // For now, we'll return an error or log it.
    console.warn('sendReport: Email sending requires Cloud Functions in a serverless architecture.');
    return throwError(() => new Error('Email sending not implemented in serverless mode yet.'));
  }
}

