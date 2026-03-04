
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Observable, Subject, from } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UeService {
  private firestore: Firestore = inject(Firestore);
  private uesCollection = collection(this.firestore, 'ues');
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  getAll(): Observable<any[]> {
    return collectionData(this.uesCollection, { idField: 'id' });
  }

  create(ue: any): Observable<any> {
    const { id, ...data } = ue;
    return from(addDoc(this.uesCollection, data)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, ue: any): Observable<any> {
    const docRef = doc(this.firestore, `ues/${id}`);
    const { id: _, ...data } = ue;
    return from(updateDoc(docRef, data)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  delete(id: string): Observable<any> {
    const docRef = doc(this.firestore, `ues/${id}`);
    return from(deleteDoc(docRef)).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}
