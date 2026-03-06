import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Classe {
  id?: string;
  name: string;
  effectif?: number;
  parcours_id?: string | null;
  parcours_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/classes`;

  constructor() {}

  getAll(): Observable<Classe[]> {
    return this.http.get<Classe[]>(this.apiUrl);
  }

  create(classe: Classe): Observable<any> {
    return this.http.post<any>(this.apiUrl, classe);
  }

  update(id: string, classe: Classe): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, classe);
  }

  delete(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
}
