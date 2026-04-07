import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy, where } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AsyncSupervisionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
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

  getAll(): Observable<any[]> {
    const colRef = collection(this.firestore, 'async_supervisions');
    const q = query(colRef, orderBy('created_at', 'desc'));
    return collectionData(q, { idField: 'id' });
  }

  getById(id: string): Observable<any> {
    const docRef = doc(this.firestore, `async_supervisions/${id}`);
    return docData(docRef, { idField: 'id' });
  }

  getByTeacher(teacherId: string): Observable<any[]> {
    const colRef = collection(this.firestore, 'async_supervisions');
    const q = query(colRef, where('teacher_id', '==', teacherId), orderBy('created_at', 'desc'));
    return collectionData(q, { idField: 'id' });
  }
}
