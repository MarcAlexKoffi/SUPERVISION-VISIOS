import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Firestore, collection, collectionData, doc, docData, query, orderBy } from '@angular/fire/firestore';
import { Observable, defer, from } from 'rxjs';
import { filter, switchMap, map } from 'rxjs/operators';
import { Auth, authState } from '@angular/fire/auth';
import { environment } from '../../environments/environment';

export interface User {
  id?: string;
  username: string;
  email?: string;
  role: string;
  created_at?: any;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private http = inject(HttpClient);
  private readonly usersApi = `${environment.apiUrl.replace(/\/$/, '')}/users`;

  getAll(): Observable<User[]> {
    const colRef = collection(this.firestore, 'users');
    const q = query(colRef, orderBy('created_at', 'desc'));
    return authState(this.auth).pipe(
      filter(user => !!user),
      switchMap(() => collectionData(q, { idField: 'id' }) as Observable<any[]>),
      map(users => users.map(user => {
        // Older Firestore profiles may still contain legacy password fields.
        // Never pass those through to a UI component.
        const { password: _password, token: _token, ...safe } = user;
        return {
          ...safe,
          created_at: user.created_at?.toDate?.() || user.created_at
        } as User;
      }))
    );
  }

  private async authorizationHeaders(): Promise<HttpHeaders> {
    await this.auth.authStateReady();
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) throw new Error('Une session administrateur valide est requise.');
    // Fresh Firebase ID token: never trust role in localStorage or send a
    // password/profile directly from the browser to Firestore.
    const idToken = await firebaseUser.getIdToken();
    return new HttpHeaders({ Authorization: `Bearer ${idToken}` });
  }

  create(user: any): Observable<any> {
    const body = {
      username: user.username,
      email: user.email,
      password: user.password,
      role: user.role
    };
    return defer(() => from(this.authorizationHeaders())).pipe(
      switchMap(headers => this.http.post(this.usersApi, body, { headers }))
    );
  }

  update(id: string, user: any): Observable<void> {
    const body = {
      username: user.username,
      email: user.email,
      role: user.role,
      ...(user.password ? { password: user.password } : {})
    };
    return defer(() => from(this.authorizationHeaders())).pipe(
      switchMap(headers => this.http.put(`${this.usersApi}/${encodeURIComponent(id)}`, body, { headers })),
      map(() => void 0)
    );
  }

  delete(id: string): Observable<void> {
    return defer(() => from(this.authorizationHeaders())).pipe(
      switchMap(headers => this.http.delete(`${this.usersApi}/${encodeURIComponent(id)}`, { headers })),
      map(() => void 0)
    );
  }

  getById(id: string): Observable<User> {
    const docRef = doc(this.firestore, `users/${id}`);
    return (docData(docRef, { idField: 'id' }) as Observable<any>).pipe(
      map(user => {
        const { password: _password, token: _token, ...safe } = user || {};
        return safe as User;
      })
    );
  }
}
