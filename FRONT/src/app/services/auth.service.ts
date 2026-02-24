import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject: BehaviorSubject<any>;
  public currentUser: Observable<any>;

  constructor(private http: HttpClient, private router: Router) {
    this.currentUserSubject = new BehaviorSubject<any>(JSON.parse(localStorage.getItem('currentUser') || 'null'));
    this.currentUser = this.currentUserSubject.asObservable();
  }


  public get currentUserValue(): any {
    return this.currentUserSubject.value; // Access value directly
  }

  login(username: string, password: string):Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { username, password })
      .pipe(map(user => {
        // Obtenir le token lors d'une connexion réussie
        if (user && user.token) {
          // Stocker les détails du user et le token pour garder l'utilisateur connecté entre les rafraichissements de page
          localStorage.setItem('currentUser', JSON.stringify(user));
          this.currentUserSubject.next(user);
        }
        return user;
      }));
  }

  register(username: string, password: string):Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, { username, password })
      .pipe(map(user => {
        if (user && user.token) {
           localStorage.setItem('currentUser', JSON.stringify(user));
           this.currentUserSubject.next(user);
        }
        return user;
      }));
  }


  logout(returnUrl?: string) {
    // Supprimer l'utilisateur du local storage lors de la déconnexion
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    
    // Redirect to login. If returnUrl is provided, include it.
    if (returnUrl) {
        this.router.navigate(['/login'], { queryParams: { returnUrl: returnUrl }});
    } else {
        this.router.navigate(['/login']);
    }
  }
}
