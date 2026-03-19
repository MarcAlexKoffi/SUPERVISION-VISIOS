import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { Auth, authState, signInWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);

  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>; // Internal observable
  public get currentUser(): Observable<any> { return this.currentUser$; } // Alias for compatibility

  public get currentUserValue(): any {
    return this.currentUserSubject.value; 
  }

  constructor() {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser$ = this.currentUserSubject.asObservable();

    // Listen to Firebase Auth state
    authState(this.auth).pipe(
      switchMap(async (firebaseUser) => {
        if (firebaseUser) {
           // User is signed in. Fetch profile from Firestore.
           const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
           try {
             const userSnapshot = await getDoc(userDocRef);
             if (userSnapshot.exists()) {
               const userData = userSnapshot.data();
               const token = await firebaseUser.getIdToken();
               return {
                 uid: firebaseUser.uid,
                 email: firebaseUser.email,
                 token: token,
                 ...userData // username, role, etc.
               };
             } else {
               // Fallback if no firestore doc
               return {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  username: firebaseUser.displayName || 'User',
                  role: 'user'
               };
             }
           } catch (e) {
             console.error('Error fetching user profile', e);
             return { uid: firebaseUser.uid, email: firebaseUser.email };
           }
        } else {
          return null;
        }
      })
    ).subscribe(user => {
      if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
      } else {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
      }
    });
  }

  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async userCredential => {
         const uid = userCredential.user.uid;
         const userDocRef = doc(this.firestore, `users/${uid}`);
         const snapshot = await getDoc(userDocRef);
         const userData = snapshot.exists() ? snapshot.data() : {};
         const token = await userCredential.user.getIdToken();
         
         const user = {
             uid,
             email: userCredential.user.email,
             token,
             ...userData
         };
         // Update local storage immediately for faster feedback if needed, 
         // though authState subscription will also do it.
         localStorage.setItem('currentUser', JSON.stringify(user));
         this.currentUserSubject.next(user);
         return user;
      })
    );
  }

  // Not used in this context but kept for interface compatibility
  register(email: string, password: string, username?: string): Observable<any> {
     // TODO: Implement registration logic with createUserWithEmailAndPassword + setDoc
     return of(null);
  }

  logout(returnUrl?: string) {
    signOut(this.auth).then(() => {
        // Manually clear the user state to avoid race conditions with authState
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
        
        if (returnUrl) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl }});
        } else {
            this.router.navigate(['/login']);
        }
    });
  }
}
