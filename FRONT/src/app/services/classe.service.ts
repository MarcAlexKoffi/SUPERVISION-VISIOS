import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface Classe {
  id?: string;
  name: string;
  effectif?: number;
  parcours_id?: string | null;
  parcours_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private firestore = inject(Firestore);

  constructor() {}

  getAll(): Observable<Classe[]> {
    const classesCollection = collection(this.firestore, 'classes');
    const q = query(classesCollection, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Classe[]>;
  }

  create(classe: Classe): Observable<any> {
    const classesCollection = collection(this.firestore, 'classes');
    return from(addDoc(classesCollection, classe));
  }

  update(id: string, classe: Classe): Observable<void> {
    const docRef = doc(this.firestore, `classes/${id}`);
    return from(updateDoc(docRef, { ...classe }));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `classes/${id}`);
    return from(deleteDoc(docRef));
  }
}
