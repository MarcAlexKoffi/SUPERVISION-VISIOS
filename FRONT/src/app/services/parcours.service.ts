import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Parcours {
  id?: number;
  code: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ParcoursService {
  private apiUrl = `${environment.apiUrl}/parcours`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Parcours[]> {
    return this.http.get<Parcours[]>(this.apiUrl);
  }

  create(parcours: Parcours): Observable<Parcours> {
    return this.http.post<Parcours>(this.apiUrl, parcours);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
