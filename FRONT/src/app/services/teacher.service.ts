
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private firestore = inject(Firestore);
  
  private cache$!: Observable<any[]>;

  constructor() { }

  getAll(): Observable<any[]> {
    if (!this.cache$) {
      const teachersCollection = collection(this.firestore, 'teachers');
      const q = query(teachersCollection, orderBy('last_name', 'asc'));
      this.cache$ = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
  }

  getById(id: string): Observable<any> {
     const docRef = doc(this.firestore, `teachers/${id}`);
     return docData(docRef, { idField: 'id' }) as Observable<any>;
  }

  create(teacher: any): Observable<any> {
    const teachersCollection = collection(this.firestore, 'teachers');
    const newTeacher = { ...teacher, created_at: new Date() };
    return from(addDoc(teachersCollection, newTeacher));
  }

  update(id: string, teacher: any): Observable<void> {
    const docRef = doc(this.firestore, `teachers/${id}`);
    return from(updateDoc(docRef, teacher));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `teachers/${id}`);
    return from(deleteDoc(docRef));
  }
}
