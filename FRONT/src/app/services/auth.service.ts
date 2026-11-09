import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { Auth, authState, signInWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private readonly cacheKey = 'currentUser';

  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;
  public get currentUser(): Observable<any> { return this.currentUser$; }
  public get currentUserValue(): any { return this.currentUserSubject.value; }

  constructor() {
    this.currentUserSubject = new BehaviorSubject<any>(this.getCachedProfile());
    this.currentUser$ = this.currentUserSubject.asObservable();

    authState(this.auth).pipe(
      switchMap(async firebaseUser => {
        if (!firebaseUser) return null;
        try {
          const snapshot = await getDoc(doc(this.firestore, `users/${firebaseUser.uid}`));
          return this.toDisplayProfile(firebaseUser, snapshot.exists() ? snapshot.data() : {});
        } catch (error) {
          console.error('Error fetching user profile', error);
          return this.toDisplayProfile(firebaseUser, {});
        }
      })
    ).subscribe(user => this.rememberProfile(user));
  }

  // Only non-sensitive display information is retained between refreshes.
  // Firebase Auth, not localStorage, is the source of live session credentials.
  private stripSecrets(user: any): any {
    if (!user || typeof user !== 'object') return null;
    const { token: _oldToken, password: _oldPassword, ...safe } = user;
    if (safe.uid && !safe.id) safe.id = safe.uid;
    return safe;
  }

  private getCachedProfile(): any {
    try {
      const cached = JSON.parse(localStorage.getItem(this.cacheKey) || 'null');
      const safe = this.stripSecrets(cached);
      // Remove any raw token/password written by older application versions.
      if (safe) localStorage.setItem(this.cacheKey, JSON.stringify(safe));
      else localStorage.removeItem(this.cacheKey);
      return safe;
    } catch {
      localStorage.removeItem(this.cacheKey);
      return null;
    }
  }

  private toDisplayProfile(firebaseUser: any, data: any): any {
    return this.stripSecrets({
      uid: firebaseUser.uid,
      id: firebaseUser.uid,
      email: firebaseUser.email,
      username: data?.username || firebaseUser.displayName || 'Utilisateur',
      name: data?.name,
      role: typeof data?.role === 'string' ? data.role : 'user'
    });
  }

  private rememberProfile(user: any): void {
    const safe = this.stripSecrets(user);
    if (safe) localStorage.setItem(this.cacheKey, JSON.stringify(safe));
    else localStorage.removeItem(this.cacheKey);
    this.currentUserSubject.next(safe);
  }

  login(email: string, password: string): Observable<any> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(async credential => {
        const firebaseUser = credential.user;
        const snapshot = await getDoc(doc(this.firestore, `users/${firebaseUser.uid}`));
        const user = this.toDisplayProfile(firebaseUser, snapshot.exists() ? snapshot.data() : {});
        this.rememberProfile(user);
        return user;
      })
    );
  }

  // Historical registration method kept for compatibility with callers.
  register(_email: string, _password: string, _username?: string): Observable<any> {
    return of(null);
  }

  logout(returnUrl?: string): void {
    signOut(this.auth).then(() => {
      this.rememberProfile(null);
      if (returnUrl) this.router.navigate(['/login'], { queryParams: { returnUrl } });
      else this.router.navigate(['/login']);
    });
  }
}
