
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UeService {
  private http = inject(HttpClient);
  // Attention: l'URL dépend de votre route backend (e.g. /ues ou /teaching-units)
  private apiUrl = environment.apiUrl + '/ues'; 
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  create(ue: any): Observable<any> {
    return this.http.post(this.apiUrl, ue).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, ue: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, ue).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}
