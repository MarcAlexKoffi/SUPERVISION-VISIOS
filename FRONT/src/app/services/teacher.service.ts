
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/teachers`;
  
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor() { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(teacher: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, teacher).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: string, teacher: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, teacher).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}
