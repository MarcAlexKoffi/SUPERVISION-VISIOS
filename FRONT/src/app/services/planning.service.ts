import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, where, getDoc, orderBy } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface Planning {
  id?: string;
  parcours: string;
  ue_id?: string | null;
  teacher_id?: string | null;
  title?: string;
  description?: string;
  date: string;
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
  ue?: { code: string; name: string };
  teacher?: { first_name: string; last_name: string; email: string };
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private firestore = inject(Firestore);

  constructor() {}

  getPlannings(filters?: { parcours?: string; startDate?: string; endDate?: string; status?: string }): Observable<Planning[]> {
    const planningsCollection = collection(this.firestore, 'plannings');
    
    // Simplification pour éviter les erreurs d'Index Firestore :
    // On filtre uniquement par DATE dans la requête Firestore pour réduire le volume,
    // et on applique les autres filtres (parcours, status) côté client (JS).
    let constraints: any[] = [orderBy('date', 'desc')];
    
    if (filters) {
       if (filters.startDate) constraints.push(where('date', '>=', filters.startDate));
       if (filters.endDate) constraints.push(where('date', '<=', filters.endDate));
    }
    
    const q = query(planningsCollection, ...constraints);
    
    return collectionData(q, { idField: 'id' }).pipe(
      map((plannings: any[]) => {
        // 1. Map data structure
        const mapped = plannings.map(p => ({
            ...p,
            ue: p.ue_code ? { code: p.ue_code, name: p.ue_name } : undefined,
            teacher: p.teacher_first_name ? { 
                first_name: p.teacher_first_name, 
                last_name: p.teacher_last_name,
                email: p.teacher_email 
            } : undefined
        }));

        // 2. Apply client-side filters (Parcours & Status)
        return mapped.filter(p => {
            let match = true;
            if (filters?.parcours && p.parcours !== filters.parcours) match = false;
            if (filters?.status && p.status !== filters.status) match = false;
            return match;
        });
      })
    );
  }

  create(planning: any): Observable<any> {
      // We need to fetch UE and Teacher details to denormalize them
      const fetchDetails = async () => {
          let ueData: any = {};
          if (planning.ue_id) {
              const ueSnap = await getDoc(doc(this.firestore, `ues/${planning.ue_id}`));
              if (ueSnap.exists()) {
                  const d = ueSnap.data();
                  ueData = { ue_code: d['code'], ue_name: d['name'] };
              }
          }

          let teacherData: any = {};
          if (planning.teacher_id) {
              const tSnap = await getDoc(doc(this.firestore, `teachers/${planning.teacher_id}`));
              if (tSnap.exists()) {
                  const d = tSnap.data();
                  teacherData = { 
                      teacher_first_name: d['first_name'], 
                      teacher_last_name: d['last_name'],
                      teacher_email: d['email']
                  };
              }
          }

          const newPlanning = {
              ...planning,
              ...ueData,
              ...teacherData,
              created_at: new Date()
          };

          return addDoc(collection(this.firestore, 'plannings'), newPlanning);
      };

      return from(fetchDetails());
  }

  update(id: string, planning: any): Observable<void> {
    const updateWithDetails = async () => {
      // 1. Remove ID and expanded objects (ue, teacher) from update payload
      // planning object is immutable? Spread it.
      const { id: _, ue, teacher, ...dataToUpdate } = planning;

      // 2. Remove undefined values to prevent Firestore errors
      Object.keys(dataToUpdate).forEach(key => dataToUpdate[key] === undefined && delete dataToUpdate[key]);

      // 3. Update denormalized data if IDs are present
      if (dataToUpdate.ue_id) {
        const ueSnap = await getDoc(doc(this.firestore, `ues/${dataToUpdate.ue_id}`));
        if (ueSnap.exists()) {
          const d = ueSnap.data();
          dataToUpdate.ue_code = d['code'];
          dataToUpdate.ue_name = d['name'];
        }
      } else if (dataToUpdate.ue_id === null) {
        // Clear UE data if unassigned (e.g. converted to general activity)
        dataToUpdate.ue_code = null;
        dataToUpdate.ue_name = null;
      }

      if (dataToUpdate.teacher_id) {
        const tSnap = await getDoc(doc(this.firestore, `teachers/${dataToUpdate.teacher_id}`));
        if (tSnap.exists()) {
          const d = tSnap.data();
          // Support both naming conventions just in case
          dataToUpdate.teacher_first_name = d['first_name'] || d['firstName'];
          dataToUpdate.teacher_last_name = d['last_name'] || d['lastName'];
          dataToUpdate.teacher_email = d['email'];
        }
      }

      const docRef = doc(this.firestore, `plannings/${id}`);
      await updateDoc(docRef, dataToUpdate);
    };

    return from(updateWithDetails());
  }

  delete(id: string): Observable<void> {
      const docRef = doc(this.firestore, `plannings/${id}`);
      return from(deleteDoc(docRef));
  }

  // Aliases for compatibility with old API OR rename them
  createPlanning(planning: any): Observable<any> {
    return this.create(planning);
  }

  updatePlanning(id: string, planning: any): Observable<any> {
    return this.update(id, planning);
  }

  deletePlanning(id: string): Observable<any> {
    return this.delete(id);
  }
}

