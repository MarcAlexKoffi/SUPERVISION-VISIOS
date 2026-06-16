import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy, where } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AsyncSupervisionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  private cache$!: Observable<any[]>;
  private teacherCache$: { [teacherId: string]: Observable<any[]> } = {};

  constructor() { }

  create(data: any): Observable<any> {
    const user = this.authService.currentUserValue;
    const newData = {
        ...data,
        supervisor_id: user ? user.uid : null,
        created_at: new Date(),
        updated_at: new Date()
    };
    const colRef = collection(this.firestore, 'async_supervisions');
    return from(addDoc(colRef, newData));
  }

  update(id: string, data: any): Observable<void> {
    const updateData = {
      ...data,
      updated_at: new Date()
    };
    const docRef = doc(this.firestore, `async_supervisions/${id}`);
    return from(updateDoc(docRef, updateData));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `async_supervisions/${id}`);
    return from(deleteDoc(docRef));
  }

  getAll(userId?: string): Observable<any[]> {
    if (userId) {
      const colRef = collection(this.firestore, 'async_supervisions');
      const q = query(colRef, where('supervisor_id', '==', userId));
      return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(shareReplay(1));
    }
    if (!this.cache$) {
      const colRef = collection(this.firestore, 'async_supervisions');
      const q = query(colRef, orderBy('created_at', 'desc'));
      this.cache$ = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  getById(id: string): Observable<any> {
    const docRef = doc(this.firestore, `async_supervisions/${id}`);
    return docData(docRef, { idField: 'id' });
  }

  getByTeacher(teacherId: string): Observable<any[]> {
    if (!this.teacherCache$[teacherId]) {
      const colRef = collection(this.firestore, 'async_supervisions');
      const q = query(colRef, where('teacher_id', '==', teacherId), orderBy('created_at', 'desc'));
      this.teacherCache$[teacherId] = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
        shareReplay(1)
      );
    }
    return this.teacherCache$[teacherId];
  }
}
