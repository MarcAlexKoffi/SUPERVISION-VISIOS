import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Planning {
  id?: string;
  parcours: string;
  ue_id?: string | null;
  teacher_id?: string | null;
  title?: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time: string;
  session_type: string;
  platform: string;
  visio_link: string;
  status: 'À superviser' | 'Supervisé' | 'Annulé';
  ue_code?: string;
  ue_name?: string;
  teacher_first_name?: string;
  teacher_last_name?: string;
  ue?: { code: string; name: string };
  teacher?: { first_name: string; last_name: string; email: string };
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/plannings`;

  constructor() {}

  getPlannings(filters?: { parcours?: string; startDate?: string; endDate?: string; status?: string }): Observable<Planning[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.parcours) params = params.set('parcours', filters.parcours);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
      if (filters.status) params = params.set('status', filters.status);
    }

    return this.http.get<any[]>(this.apiUrl, { params }).pipe(
      map(plannings => plannings.map(p => ({
        ...p,
        // Map backend flat structure to frontend nested structure if needed
        ue: p.ue_code ? { code: p.ue_code, name: p.ue_name } : undefined,
        teacher: p.teacher_first_name ? { 
            first_name: p.teacher_first_name, 
            last_name: p.teacher_last_name, 
            email: p.teacher_email 
        } : undefined
      })))
    );
  }

  createPlanning(planning: Planning): Observable<any> {
    return this.http.post<any>(this.apiUrl, planning);
  }

  updatePlanning(id: string, planning: Partial<Planning>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, planning);
  }

  deletePlanning(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

