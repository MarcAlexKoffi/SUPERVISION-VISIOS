import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Planning {
  id?: number;
  parcours: string;
  ue_id: number;
  teacher_id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  session_type: string;
  platform: string;
  visio_link: string;
  status: 'À superviser' | 'Supervisé' | 'Annulé';
  ue_code?: string;
  ue_name?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private apiUrl = `${environment.apiUrl}/plannings`;

  constructor(private http: HttpClient) {}

  getPlannings(filters?: { parcours?: string; startDate?: string; endDate?: string; status?: string }): Observable<Planning[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.parcours) params = params.set('parcours', filters.parcours);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.status) params = params.set('status', filters.status);
    }
    return this.http.get<Planning[]>(this.apiUrl, { params });
  }

  createPlanning(planning: Planning): Observable<any> {
    return this.http.post(this.apiUrl, planning);
  }

  updatePlanning(id: number, planning: Partial<Planning>): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, planning);
  }

  deletePlanning(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
