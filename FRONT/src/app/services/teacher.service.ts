
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, Subject, from } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private firestore: Firestore = inject(Firestore);
  private teachersCollection = collection(this.firestore, 'teachers');
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  getAll(): Observable<any[]> {
    return collectionData(this.teachersCollection, { idField: 'id' });
  }

  getById(id: string): Observable<any> {
    const docRef = doc(this.firestore, `teachers/${id}`);
    return docData(docRef, { idField: 'id' });
  }

  create(teacher: any): Observable<any> {
    const { id, ...data } = teacher;
    return from(addDoc(this.teachersCollection, data)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, teacher: any): Observable<any> {
    const docRef = doc(this.firestore, `teachers/${id}`);
    const { id: _, ...data } = teacher;
    return from(updateDoc(docRef, data)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  delete(id: string): Observable<any> {
    const docRef = doc(this.firestore, `teachers/${id}`);
    return from(deleteDoc(docRef)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}
