import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
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
  private firestore: Firestore = inject(Firestore);
  private parcoursCollection = collection(this.firestore, 'parcours');

  constructor() {}

  getAll(): Observable<Parcours[]> {
    return collectionData(this.parcoursCollection, { idField: 'id' }) as Observable<Parcours[]>;
  }

  create(parcours: Parcours): Observable<any> {
    const { id, ...data } = parcours;
    return from(addDoc(this.parcoursCollection, data));
  }

  update(id: string, parcours: Parcours): Observable<any> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    const { id: _, ...data } = parcours;
    return from(updateDoc(docRef, data));
  }

  delete(id: string): Observable<any> {
    const docRef = doc(this.firestore, `parcours/${id}`);
    return from(deleteDoc(docRef));
  }
}

