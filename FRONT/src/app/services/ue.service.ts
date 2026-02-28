
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UeService {
  private apiUrl = `${environment.apiUrl}/ues`;
  private _refreshNeeded$ = new Subject<void>();

  get refreshNeeded$() {
    return this._refreshNeeded$;
  }

  constructor(private http: HttpClient) { }

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

  update(id: number, ue: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, ue).pipe(
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
