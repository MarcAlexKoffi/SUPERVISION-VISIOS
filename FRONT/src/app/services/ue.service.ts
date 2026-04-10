
import { Injectable, inject } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { switchMap, map, shareReplay } from 'rxjs/operators';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, deleteDoc, query, where, orderBy } from '@angular/fire/firestore';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class UeService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  
  private cache$!: Observable<any[]>;

  constructor() { }

  getAll(): Observable<any[]> {
    if (!this.cache$) {
      this.cache$ = this.authService.currentUser$.pipe(
        switchMap(user => {
          if (!user) return of([]);
          
          const uesCollection = collection(this.firestore, 'ues');
          let q;
        
        // Requête conditionnelle selon le rôle
        if (user.role === 'admin') {
          q = query(uesCollection);
        } else {
          q = query(uesCollection, where('user_id', '==', user.uid));
        }
        
        return (collectionData(q, { idField: 'id' }) as Observable<any[]>).pipe(
          map(ues => ues.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
        );
      }),
      shareReplay(1)
    );
    }
    return this.cache$;
  }

  create(ue: any): Observable<any> {
    const user = this.authService.currentUserValue;
    if (!user) throw new Error('User not authenticated');

    const uesCollection = collection(this.firestore, 'ues');
    const newUe = {
        ...ue,
        user_id: user.uid,
        created_at: new Date() // Firestore Timestamp preferred but Date works
    };
    
    return from(addDoc(uesCollection, newUe));
  }

  update(id: string, ue: any): Observable<void> {
    const docRef = doc(this.firestore, `ues/${id}`);
    // Exclude fields that shouldn't be updated if necessary
    return from(updateDoc(docRef, ue));
  }

  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `ues/${id}`);
    return from(deleteDoc(docRef));
  }
}
