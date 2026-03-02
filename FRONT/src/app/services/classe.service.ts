import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Classe {
  id?: number;
  name: string;
  effectif: number;
  parcours_id?: number | null;
  parcours_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClasseService {
  private apiUrl = `${environment.apiUrl}/classes`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Classe[]> {
    return this.http.get<Classe[]>(this.apiUrl);
  }

  create(classe: Classe): Observable<Classe> {
    return this.http.post<Classe>(this.apiUrl, classe);
  }

  update(id: number, classe: Classe): Observable<Classe> { // Assuming existing endpoint accepts PUT
    return this.http.put<Classe>(`${this.apiUrl}/${id}`, classe);
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
