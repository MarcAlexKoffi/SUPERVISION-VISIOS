
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TeacherService {
  private apiUrl = `${environment.apiUrl}/teachers`;
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  create(teacher: any): Observable<any> {
    return this.http.post(this.apiUrl, teacher).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  update(id: number, teacher: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, teacher).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      tap(() => {
        this._refreshNeeded$.next();
      })
    );
  }
}
