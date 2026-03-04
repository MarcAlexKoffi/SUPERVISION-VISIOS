import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { 
  Firestore, collection, collectionData, query, where, orderBy, 
  addDoc, doc, updateDoc, deleteDoc, DocumentReference 
} from '@angular/fire/firestore';

export interface Planning {
  id?: string; // Changed to string for Firestore ID
  parcours: string;
  ue_id?: string | null; // Changed to string reference or keep number if legacy
  teacher_id: string; // Changed to string reference
  title?: string;
  description?: string;
  date: string; // YYYY-MM-DD
  start_time?: string;
  end_time: string;
  session_type: string;
  platform: string;
  visio_link: string;
  status: 'À superviser' | 'Supervisé' | 'Annulé';
  ue_code?: string;
  ue_name?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  // Denormalized objects (optional but recommended for display)
  ue?: { code: string; name: string };
  teacher?: { first_name: string; last_name: string; email: string };
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private firestore: Firestore = inject(Firestore);
  private planningsCollection = collection(this.firestore, 'plannings');

  constructor() {}

  getPlannings(filters?: { parcours?: string; startDate?: string; endDate?: string; status?: string }): Observable<Planning[]> {
    let q = query(this.planningsCollection, orderBy('date', 'asc'), orderBy('start_time', 'asc'));

    if (filters) {
      if (filters.parcours) {
        q = query(q, where('parcours', '==', filters.parcours));
      }
      if (filters.startDate) {
        q = query(q, where('date', '>=', filters.startDate));
      }
      if (filters.endDate) {
        q = query(q, where('date', '<=', filters.endDate));
      }
      if (filters.status) {
         q = query(q, where('status', '==', filters.status));
      }
    }
    
    // cast result to Planning[] including ID
    return collectionData(q, { idField: 'id' }) as Observable<Planning[]>;
  }

  createPlanning(planning: Planning): Observable<DocumentReference> {
    // Clean undefined fields if needed, but Firestore handles it mostly fine.
    // Ensure we don't pass 'id' in the body
    const { id, ...data } = planning;
    return from(addDoc(this.planningsCollection, data));
  }

  updatePlanning(id: string, planning: Partial<Planning>): Observable<void> {
    const docRef = doc(this.firestore, `plannings/${id}`);
    return from(updateDoc(docRef, planning));
  }

  deletePlanning(id: string): Observable<void> {
    const docRef = doc(this.firestore, `plannings/${id}`);
    return from(deleteDoc(docRef));
  }
}

