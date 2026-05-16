
import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, addDoc, updateDoc, deleteDoc, query, orderBy, where } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  private allCache$?: Observable<any[]>;
  private userCache$: { [userId: string]: Observable<any[]> } = {};

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

  getAll(userId?: string): Observable<any[]> {
    const colRef = collection(this.firestore, 'supervisions');

    if (userId) {
      if (!this.userCache$[userId]) {
        const q = query(colRef, where('user_id', '==', userId));
        this.userCache$[userId] = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(data => {
            return data.sort((a, b) => {
              const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
              const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
              return dateB - dateA;
            });
          }),
          shareReplay(1)
        );
      }
      return this.userCache$[userId]!;
    } else {
      if (!this.allCache$) {
        const q = query(colRef, orderBy('created_at', 'desc'));
        this.allCache$ = (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(data => {
            return data.sort((a, b) => {
              const dateA = a.created_at ? (a.created_at.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime()) : 0;
              const dateB = b.created_at ? (b.created_at.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime()) : 0;
              return dateB - dateA;
            });
          }),
          shareReplay(1)
        );
      }
      return this.allCache$!;
    }
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

