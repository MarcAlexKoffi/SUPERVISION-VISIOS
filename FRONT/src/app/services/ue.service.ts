
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UeService {
  private apiUrl = 'http://localhost:3000/api/ues';

  constructor(private http: HttpClient) { }

  getAll(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  create(ue: any): Observable<any> {
    return this.http.post(this.apiUrl, ue);
  }

  update(id: number, ue: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, ue);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
