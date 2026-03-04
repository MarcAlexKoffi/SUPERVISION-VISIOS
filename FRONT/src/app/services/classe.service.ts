import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
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
  private firestore: Firestore = inject(Firestore);
  private classesCollection = collection(this.firestore, 'classes');
  // If 'classes' and 'parcours' were different in MySQL, we need careful mapping.
  // In previous context, 'parcours' route handled 'classes'.

  constructor() {}

  getAll(): Observable<Classe[]> {
    return collectionData(this.classesCollection, { idField: 'id' }) as Observable<Classe[]>;
  }

  create(classe: Classe): Observable<any> {
    const { id, ...data } = classe;
    return from(addDoc(this.classesCollection, data));
  }

  update(id: string, classe: Classe): Observable<any> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    const { id: _, ...data } = classe;
    return from(updateDoc(docRef, data));
  }

  delete(id: string): Observable<any> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    return from(deleteDoc(docRef));
  }
}
