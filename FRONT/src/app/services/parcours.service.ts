import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';

export interface Parcours {
  id?: string;
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParcoursService {
  private firestore = inject(Firestore);
  
  constructor() {}

  getAll(): Observable<Parcours[]> {
    const parcoursCollection = collection(this.firestore, 'parcours');
    const q = query(parcoursCollection, orderBy('name', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Parcours[]>;
  }

  create(parcours: Parcours): Observable<any> {
    const parcoursCollection = collection(this.firestore, 'parcours');
    return from(addDoc(parcoursCollection, parcours));
  }

  update(id: string, parcours: Parcours): Observable<void> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    return from(updateDoc(docRef, { ...parcours }));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    return from(deleteDoc(docRef));
  }
}

