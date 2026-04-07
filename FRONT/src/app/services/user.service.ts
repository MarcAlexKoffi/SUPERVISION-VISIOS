import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, docData, setDoc, updateDoc, deleteDoc, query, orderBy } from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { filter, take, switchMap, map } from 'rxjs/operators';
import { initializeApp, deleteApp } from 'firebase/app';
import { Auth, authState } from '@angular/fire/auth';
import { getAuth, createUserWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';
import { environment } from '../../environments/environment';

export interface User {
  id?: string;
  username: string;
  email?: string;
  role: string;
  // password intentionally omitted as it's handled by Auth
  created_at?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);

  constructor() { }

  getAll(): Observable<User[]> {
    const colRef = collection(this.firestore, 'users');
    const q = query(colRef, orderBy('created_at', 'desc'));
    return authState(this.auth).pipe(
      filter(user => !!user),
      switchMap(() => collectionData(q, { idField: 'id' }) as Observable<any[]>),
      map(users => users.map(user => {
        if (user.created_at && typeof user.created_at.toDate === 'function') {
          user.created_at = user.created_at.toDate();
        }
        return user as User;
      }))
    );
  }

  // Create a new user in BOTH Firebase Auth and Firestore
  // Uses a secondary app instance to avoid logging out the current admin
  create(user: any): Observable<any> {
    const creationPromise = async () => {
        const { email, password, username, role } = user;
        
        // Create a unique name for the secondary app instance
        const secondaryAppName = `secondaryApp-${Date.now()}`;
        const secondaryApp = initializeApp(environment.firebase, secondaryAppName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
            await setPersistence(secondaryAuth, inMemoryPersistence);
            
            // 1. Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const uid = userCredential.user.uid;

            // 2. Create user profile in Firestore with the same UID
            const userDocRef = doc(this.firestore, `users/${uid}`);
            const userData = {
                username,
                email,
                role: role || 'enseignant',
                created_at: new Date()
            };
            
            await setDoc(userDocRef, userData);
            
            // 3. Cleanup: Sign out from the secondary app
            await signOut(secondaryAuth);
            
            return { id: uid, ...userData };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        } finally {
            // 4. Delete the secondary app instance to free resources
            await deleteApp(secondaryApp);
        }
    };

    return from(creationPromise());
  }

  update(id: string, user: any): Observable<void> {
    const docRef = doc(this.firestore, `users/${id}`);
    // Exclude password if present in user object
    const { password, ...userData } = user; 
    return from(updateDoc(docRef, userData));
  }

  // NOTE: This only deletes the Firestore document. The Auth user remains.
  delete(id: string): Observable<void> {
    const docRef = doc(this.firestore, `users/${id}`);
    return from(deleteDoc(docRef));
  }

  getById(id: string): Observable<User> {
    const docRef = doc(this.firestore, `users/${id}`);
    return docData(docRef, { idField: 'id' }) as Observable<User>;
  }
}
