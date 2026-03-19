
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  constructor() { }

  create(data: any): Observable<any> {
    const user = this.authService.currentUserValue;
    const newData = {
        ...data,
        user_id: user ? user.uid : null,
        created_at: new Date()
    };
    const colRef = collection(this.firestore, 'supervisions');
    return from(addDoc(colRef, newData));
  }

  update(id: string, data: any): Observable<void> {
    const docRef = doc(this.firestore, `supervisions/${id}`);
    return from(updateDoc(docRef, data));
  }

  getAll(): Observable<any[]> {
    const colRef = collection(this.firestore, 'supervisions');
    const q = query(colRef, orderBy('created_at', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<any[]>;
  }

  getById(id: string): Observable<any> {
      const docRef = doc(this.firestore, `supervisions/${id}`);
      return docData(docRef, { idField: 'id' });
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `supervisions/${id}`);
    return from(deleteDoc(docRef));
  }

  sendReport(id: string, data: { pdfBase64: string, teacherEmail: string, subject?: string, message?: string }): Observable<any> {
    // This requires a Cloud Function as it involves sending emails securely.
    // For now, we'll return an error or log it.
    console.warn('sendReport: Email sending requires Cloud Functions in a serverless architecture.');
    return throwError(() => new Error('Email sending not implemented in serverless mode yet.'));
  }
}

