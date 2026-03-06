import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Parcours {
  id?: string;
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParcoursService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/parcours`;
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() {}

  getAll(): Observable<Parcours[]> {
    return this.http.get<Parcours[]>(this.apiUrl);
  }

  create(parcours: Parcours): Observable<any> {
    return this.http.post<any>(this.apiUrl, parcours).pipe(
        tap(() => this._refreshNeeded$.next())
    );
  }

  update(id: string, parcours: Parcours): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, parcours).pipe(
        tap(() => this._refreshNeeded$.next())
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
        tap(() => this._refreshNeeded$.next())
    );
  }
}

