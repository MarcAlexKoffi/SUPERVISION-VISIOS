import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { Auth, authState, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);
  private router: Router = inject(Router);

  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>; // Internal observable
  public get currentUser(): Observable<any> { return this.currentUser$; } // Alias for compatibility

  constructor() {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    
    // Subscribe to Firebase Auth State (updates behavior subject)
    this.currentUser$ = authState(this.auth).pipe(
        switchMap(async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch extra data from Firestore (role, username)
                const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
                const userSnapshot = await getDoc(userDocRef);
                const userData = userSnapshot.exists() ? userSnapshot.data() as any : {};
                
                const userProfile = {
                   uid: firebaseUser.uid,
                   email: firebaseUser.email,
                   role: userData?.role || 'user',
                   username: userData?.username || firebaseUser.email?.split('@')[0],
                   token: await firebaseUser.getIdToken() // For compatibility with interceptors if needed
                };
                
                // Update local storage for sync access if needed (legacy support)
                localStorage.setItem('currentUser', JSON.stringify(userProfile));
                this.currentUserSubject.next(userProfile);
                return userProfile;
            } else {
                localStorage.removeItem('currentUser');
                this.currentUserSubject.next(null);
                return null;
            }
        })
    );
    
    // Trigger initial load
    this.currentUser$.subscribe();
  }

  public get currentUserValue(): any {
    return this.currentUserSubject.value; 
  }

  login(email: string, password: string): Observable<any> {
    // Basic helper for username -> email if needed (simple heuristic)
    const finalEmail = email.includes('@') ? email : `${email}@supervision.local`;

    return from(signInWithEmailAndPassword(this.auth, finalEmail, password)).pipe(
       switchMap(credential => {
           // Return the full user profile immediately
           return this.currentUser$; // Wait for the state change to propagate
       })
    );
  }

  register(email: string, password: string, username?: string): Observable<any> {
     const finalEmail = email.includes('@') ? email : `${email}@supervision.local`;

     return from(createUserWithEmailAndPassword(this.auth, finalEmail, password)).pipe(
         switchMap(async (credential) => {
             // Create user document in Firestore
             const userDocRef = doc(this.firestore, `users/${credential.user.uid}`);
             const userData = {
                 username: username || email.split('@')[0],
                 email: finalEmail,
                 role: 'user', // Default role
                 created_at: new Date()
             };
             await setDoc(userDocRef, userData);
             return credential.user;
         })
     );
  }

  logout(returnUrl?: string) {
    signOut(this.auth).then(() => {
        // Redirection handled by router if needed, or explicitly here
        if (returnUrl) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl }});
        } else {
            this.router.navigate(['/login']);
        }
    });
  }
}
