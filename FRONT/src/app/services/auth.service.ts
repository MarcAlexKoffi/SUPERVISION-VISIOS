import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl + '/auth';

  private currentUserSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>; // Internal observable
  public get currentUser(): Observable<any> { return this.currentUser$; } // Alias for compatibility

  public get currentUserValue(): any {
    return this.currentUserSubject.value; 
  }

  constructor() {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser$ = this.currentUserSubject.asObservable();
  }

  login(email: string, password: string): Observable<any> {
    
    // Pour le backend local MySQL, on utilise 'username'
    // On envoie ce que l'utilisateur a saisi directement
    const username = email; 

    // MODE LOCAL ADMIN (BYPASS)
    if (username === 'admin' && password === 'admin') {
         const fakeAdmin = {
             uid: 'local-admin-id',
             email: 'admin@supervision.local',
             role: 'admin',
             username: 'Admin Local',
             token: 'fake-jwt-token-for-local-testing'
         };
         localStorage.setItem('currentUser', JSON.stringify(fakeAdmin));
         this.currentUserSubject.next(fakeAdmin);
         return of(fakeAdmin);
    }

    // Le backend attend { username, password } et non { email, password }
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password }).pipe(
      tap(response => {
           // Adapt response based on your backend structure
           const user = response.user || response;
           const userProfile = {
                 ...user,
                 token: response.token || user.token,
                 uid: user.id // Mapping for frontend compat
           };
           localStorage.setItem('currentUser', JSON.stringify(userProfile));
           this.currentUserSubject.next(userProfile);
      })
    );
  }

  // Not used in this context but kept for interface compatibility
  register(email: string, password: string, username?: string): Observable<any> {
     return this.http.post(`${this.apiUrl}/register`, { email, password, username });
  }

  logout(returnUrl?: string) {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    if (returnUrl) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl }});
    } else {
        this.router.navigate(['/login']);
    }
  }
}
