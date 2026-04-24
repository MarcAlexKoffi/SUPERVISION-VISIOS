import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupervisionService } from '../services/supervision.service';
import { AsyncSupervisionService } from '../services/async-supervision.service';
import { parseDate } from '../shared/utils/date.utils';

@Component({
  selector: 'app-honoraires',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './honoraires.html',
  styleUrls: ['./honoraires.scss'],
})
export class HonorairesComponent implements OnInit {
  teacher: string = '';
  course: string = '';
  startDate: string = '';
  endDate: string = '';

  supervisions: any[] = [];
  asyncSupervisions: any[] = [];

  totalHeuresSynchroneFormate: string = '00h00';
  totalDureeSynchroneMinutes: number = 0;

  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supervisionService: SupervisionService,
    private asyncSupervisionService: AsyncSupervisionService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.teacher = params['teacher'] || '';
      this.course = params['course'] || '';
      this.startDate = params['start'] || '';
      this.endDate = params['end'] || '';

      if (this.teacher && this.course) {
        this.loadData();
      }
    });
  }

  loadData() {
    const filterTeacher = (this.teacher || '').trim().toLowerCase();
    const filterCourse = (this.course || '').trim().toLowerCase();

    // Charger synchrones
    this.supervisionService.getAll().subscribe({
      next: (data) => {
        let filtered = data.filter((s: any) => {
          let tName = (s.teacher?.name || '').trim().toLowerCase();
          let cName = (s.course?.name || '').trim().toLowerCase();
          return tName === filterTeacher && cName === filterCourse;
        });

        if (this.startDate) {
          const startDate = new Date(this.startDate);
          startDate.setHours(0, 0, 0, 0);
          const startNum = startDate.getTime();
          filtered = filtered.filter((s: any) => {
            const d = parseDate(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() >= startNum;
          });
        }
        if (this.endDate) {
          const endDate = new Date(this.endDate);
          endDate.setHours(23, 59, 59, 999);
          const endNum = endDate.getTime();
          filtered = filtered.filter((s: any) => {
            const d = parseDate(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() <= endNum;
          });
        }
        
        this.supervisions = filtered.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
        this.calculateTotalSynchrone();
      }
    });

    // Charger asynchrones
    this.asyncSupervisionService.getAll().subscribe({
      next: (data) => {
        let filtered = data.filter((s: any) => {
           let tName = (s.teacher?.name || s.teacher_name || '').trim().toLowerCase();
           let cName = (s.ue?.name || s.ue_name || '').trim().toLowerCase();
           return tName === filterTeacher && cName === filterCourse;
        });

        if (this.startDate) {
          const startDate = new Date(this.startDate);
          startDate.setHours(0, 0, 0, 0);
          const startNum = startDate.getTime();
          filtered = filtered.filter((s: any) => {
            if (!s.date) return true; // si pas de date, on le laisse par defaut
            const d = parseDate(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() >= startNum;
          });
        }
        if (this.endDate) {
          const endDate = new Date(this.endDate);
          endDate.setHours(23, 59, 59, 999);
          const endNum = endDate.getTime();
          filtered = filtered.filter((s: any) => {
            if (!s.date) return true;
            const d = parseDate(s.date);
            d.setHours(0, 0, 0, 0);
            return d.getTime() <= endNum;
          });
        }
        this.asyncSupervisions = filtered;
      }
    });
  }

  calculateTotalSynchrone() {
    this.totalDureeSynchroneMinutes = 0;
    for (const s of this.supervisions) {
      this.totalDureeSynchroneMinutes += s.duration || 0;
    }
    const heures = Math.floor(this.totalDureeSynchroneMinutes / 60);
    const minutes = this.totalDureeSynchroneMinutes % 60;
    this.totalHeuresSynchroneFormate = `${heures}h${minutes < 10 ? '0' + minutes : minutes}`;
  }

  getDuration(s: any): string {
    const h = Math.floor(s.duration / 60);
    const m = s.duration % 60;
    return `${h}h${m < 10 ? '0' + m : m}`;
  }

  print() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/admin/history']);
  }
}
