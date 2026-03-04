
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc, getDoc } from '@angular/fire/firestore';
import { Observable, Subject, from } from 'rxjs';
import { tap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private firestore: Firestore = inject(Firestore);
  private supervisionsCollection = collection(this.firestore, 'supervisions');
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  create(data: any): Observable<any> {
    const { id, ...cleanData } = data;
    return from(addDoc(this.supervisionsCollection, cleanData)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, data: any): Observable<any> {
    const docRef = doc(this.firestore, `supervisions/${id}`);
    const { id: _, ...cleanData } = data;
    return from(updateDoc(docRef, cleanData)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  getAll(): Observable<any[]> {
    return collectionData(this.supervisionsCollection, { idField: 'id' });
  }

  getById(id: string): Observable<any> {
      const docRef = doc(this.firestore, `supervisions/${id}`);
      return from(getDoc(docRef)).pipe(
          map(snapshot => snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null)
      );
  }

  delete(id: string): Observable<any> {
    const docRef = doc(this.firestore, `supervisions/${id}`);
    return from(deleteDoc(docRef)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}

