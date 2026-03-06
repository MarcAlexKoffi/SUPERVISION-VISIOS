
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupervisionService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/supervisions';
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: string): Observable<any> {
      return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}

