import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SupervisionService } from '../services/supervision.service'; // Import Service
import { AuthService } from '../services/auth.service';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ConfirmationModalComponent],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class HistoryComponent implements OnInit, OnDestroy {
  filters = {
    teacher: '',
    course: '',
    startDate: '',
    endDate: ''
  };

  supervisions: any[] = [];
  filteredSupervisions: any[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math; // Expose Math to template

  // Filters Options
  teachers: string[] = [];
  courses: string[] = [];

  // Modal
  selectedSupervision: any = null;
  filteredHistoryForUE: any[] = [];
  showModal = false;

  // Delete Modal
  showDeleteModal = false;
  supervisionToDelete: any = null;

  isPrinting = false;
  currentDate = Date.now();

  isAdmin = false;
  currentUser: any = null;
  private subscriptions: Subscription = new Subscription();

  constructor(
    private supervisionService: SupervisionService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.isAdmin = this.currentUser?.role === 'admin';
    this.loadHistory();

    this.subscriptions.add(
      this.supervisionService.refreshNeeded$.subscribe(() => {
        this.loadHistory();
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
editSupervision(supervision: any) {
    // Navigate to supervision-form with an ID parameter or state
    this.router.navigate(['/admin/supervision-form'], { queryParams: { id: supervision.id } });
  }

  
  printHistory() {
    this.isPrinting = true;
    setTimeout(() => {
      window.print();
      this.isPrinting = false;
    }, 100);
  }

  get printSupervisions(): any[] {
    // Return filtered supervisions sorted by date ASC for printing
    return [...this.filteredSupervisions].sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  get totalDuration(): string {
    let totalMinutes = 0;
    this.filteredSupervisions.forEach(s => {
      const start = this.parseTime(s.startTimeStr);
      const end = this.parseTime(s.endTimeStr);
      let diff = end - start;
      // Handle overnight or simply ensure positive duration
      if (diff < 0) diff += 24 * 60;

      // Only count if diff makes sense (e.g. > 0)
      if (diff > 0) {
        totalMinutes += diff;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes.toString().padStart(2, '0')}`;
  }

  getDuration(s: any): string {
    const start = this.parseTime(s.startTimeStr);
    const end = this.parseTime(s.endTimeStr);
    if (start === 0 && end === 0) return '0h 00';

    let diff = end - start;
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;

    return `${hours}h ${minutes.toString().padStart(2, '0')}`;
  }

  parseTime(timeStr: string): number {
    if (!timeStr) return 0;
    try {
      const parts = timeStr.split(':');
      if (parts.length < 2) return 0;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(minutes) ? 0 : minutes);
    } catch (e) {
      return 0;
    }
  }

  loadHistory() {
    // Call API instead of localStorage
    this.supervisionService.getAll().subscribe({
      next: (data) => {
        console.log('Raw History Data:', data);
        // Backend handles filtering, but we enforce it here proactively just in case or for immediate UI feedback
        if (!this.isAdmin && this.currentUser) {
          // data = data.filter((item: any) => item.user_id === this.currentUser.id);
        }
        this.supervisions = data.map((item: any) => this.mapToView(item));
        console.log('Mapped History Data:', this.supervisions);
        this.updateFilters();
        this.applyFilters();
      },
      error: (err) => console.error('Failed to load history', err)
    });
  }

  updateFilters() {
    // Extract unique teachers and courses for filter dropdowns
    const historyTeachers = this.supervisions.map(s => s.teacher.name).filter(Boolean);
    const historyCourses = this.supervisions.map(s => s.course.name).filter(Boolean);

    this.teachers = [...new Set(historyTeachers)].sort();
    this.courses = [...new Set(historyCourses)].sort();
  }

  onTeacherChange() {
    this.filters.course = '';
    this.applyFilters();
  }

  applyFilters() {
    this.filteredSupervisions = this.supervisions.filter(s => {
      // Teacher Filter
      const matchTeacher = !this.filters.teacher || s.teacher.name === this.filters.teacher;

      // Course Filter
      const matchCourse = !this.filters.course || s.course.name === this.filters.course;

      // Date Filter
      let matchDate = true;
      const itemDate = new Date(s.date);
      itemDate.setHours(0, 0, 0, 0); // Normaliser l'heure pour comparer juste les dates

      if (this.filters.startDate) {
        const start = new Date(this.filters.startDate);
        start.setHours(0, 0, 0, 0);
        matchDate = matchDate && itemDate >= start;
      }

      if (this.filters.endDate) {
        const end = new Date(this.filters.endDate);
        end.setHours(23, 59, 59, 999);
        matchDate = matchDate && itemDate <= end;
      }

      return matchTeacher && matchCourse && matchDate;
    });

    this.currentPage = 1; // Reset to page 1 on filter change
  }



  private mapToView(data: any): any {
    // Map API/DB structure to View structure
    // DB: teacher_name, module, visit_date, etc.
    // View Expects: teacher.name, course.name, date (Date obj), etc.

    // Check if data comes from DB (snake_case) or legacy/local (camelCase)
    // Prioritize joined data from relational tables if available
    let teacherName = data.teacher_name || data.teacherName || 'Non spécifié';
    if (data.teacher_firstname && data.teacher_lastname) {
      teacherName = `${data.teacher_firstname} ${data.teacher_lastname}`;
    }

    let moduleName = data.module || 'Non spécifié';
    // If we have relate UE data, prioritize it
    if (data.ue_real_name) {
      // If code is available, format: CODE - Name. Else just Name.
      moduleName = data.ue_real_name;
      if (data.ue_code) {
        moduleName = `${data.ue_code} - ${moduleName}`;
      }
    } else if (data.ue_code) {
      // If only code is available (edge case)
      moduleName = `${data.ue_code} - ${moduleName}`;
    }

    const dateStr = data.visit_date || data.date; // Ensure this is not undefined
    const startTimeStr = data.start_time || data.startTime || '00:00';
    const endTimeStr = data.end_time || data.endTime || '00:00';

    // Handle time format if it comes as HH:MM:SS from mysql
    const formatTime = (t: string) => t && t.length > 5 ? t.substring(0, 5) : t;

    let dateObj = new Date();
    if (dateStr) {
      dateObj = new Date(dateStr);
    }

    // Validate dateObj
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date found:', dateStr, data);
      dateObj = new Date(); // Fallback to now
    }

    const startDateTime = new Date(dateObj);
    // Note: Creating date objects for time is tricky if only time string provided, using base date
    if (typeof startTimeStr === 'string' && startTimeStr.includes(':')) {
      startDateTime.setHours(parseInt(startTimeStr.split(':')[0]), parseInt(startTimeStr.split(':')[1]));
    }

    const endDateTime = new Date(dateObj);
    if (typeof endTimeStr === 'string' && endTimeStr.includes(':')) {
      endDateTime.setHours(parseInt(endTimeStr.split(':')[0]), parseInt(endTimeStr.split(':')[1]));
    }

    const signatures = {
      supervisor: data.supervisor_signature || (data.signatures && data.signatures.supervisor),
      teacher: data.teacher_signature || (data.signatures && data.signatures.teacher)
    };

    const technical = {
      internet: data.tech_internet || (data.technical && data.technical.internet),
      audioVideo: data.tech_audio_video || (data.technical && data.technical.audioVideo),
      punctuality: data.tech_punctuality || (data.technical && data.technical.punctuality)
    };

    const pedagogical = {
      objectives: data.ped_objectives || (data.pedagogical && data.pedagogical.objectives),
      contentMastery: data.ped_content_mastery || (data.pedagogical && data.pedagogical.contentMastery),
      interaction: data.ped_interaction || (data.pedagogical && data.pedagogical.interaction),
      toolsUsage: data.ped_tools_usage || (data.pedagogical && data.pedagogical.toolsUsage)
    };

    return {
      id: data.id,
      originalData: data,
      date: new Date(dateStr), // Keep just the date part for filtering/sorting if needed, or full datetime
      endTime: endDateTime, // Used for display duration/end time
      startTimeStr: formatTime(startTimeStr),
      endTimeStr: formatTime(endTimeStr),
      teacher: {
        name: teacherName,
        department: data.level || 'Niveau non spécifié',
        initials: this.getInitials(teacherName),
        color: this.getRandomColor(teacherName)
      },
      sessionNumber: data.session_number || data.sessionNumber || '',
      course: {
        code: 'UE',
        name: moduleName
      },
      platform: data.platform || 'Autre',
      platformIcon: this.getPlatformIcon(data.platform),
      platformColor: this.getPlatformColor(data.platform),
      status: 'Terminé',
      statusColor: 'bg-green-100 text-green-700',

      presentCount: data.present_count || data.presentCount || 0,
      totalStudents: data.total_students || data.totalStudents || 0,

      technical: technical,
      pedagogical: pedagogical,

      observations: data.observations || '',
      supervisorName: data.supervisor_name || data.supervisorName || '',
      signatures: signatures,
      createdAt: data.created_at ? new Date(data.created_at) : new Date() // Ajout de la date d'enregistrement
    };
  }

  get paginatedSupervisions() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSupervisions.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredSupervisions.length / this.itemsPerPage);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  get startItem() {
    if (this.filteredSupervisions.length === 0) return 0;
    return (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem() {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredSupervisions.length);
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  deleteSupervision(supervision: any) {
    this.supervisionToDelete = supervision;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (!this.supervisionToDelete) return;

    this.supervisionService.delete(this.supervisionToDelete.id).subscribe({
      next: () => {
        this.supervisions = this.supervisions.filter(s => s.id !== this.supervisionToDelete.id);
        this.updateFilters();
        this.applyFilters();
        this.cancelDelete();
      },
      error: (err) => {
        console.error('Error deleting supervision', err);
        if (err.status === 403) {
          alert('Vous n\'avez pas les droits pour supprimer cet enregistrement.');
        } else {
          alert('Erreur lors de la suppression');
        }
        this.cancelDelete();
      }
    });
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.supervisionToDelete = null;
  }

  exportCSV() {
    if (this.filteredSupervisions.length === 0) return;

    const headers = ['Date', 'Heure Debut', 'Heure Fin', 'Enseignant', 'UE/Module', 'Plateforme', 'Statut'];
    const rows = this.filteredSupervisions.map(s => [
      s.date.toLocaleDateString(),
      s.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      s.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      s.teacher.name,
      s.course.name,
      s.platform,
      s.status
    ]);

    let csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `supervisions_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  viewDetails(supervision: any) {
    // 1. Find all supervisions for this specific UE/Course
    this.filteredHistoryForUE = this.supervisions
      .filter(s => s.course.name === supervision.course.name)
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort by date desc (newest first)

    // 2. Select the clicked one initially
    this.selectedSupervision = supervision;
    this.showModal = true;
  }

  selectSupervisionFromHistory(supervision: any) {
    this.selectedSupervision = supervision;
  }

  closeModal() {
    this.showModal = false;
    this.selectedSupervision = null;
    this.filteredHistoryForUE = [];
  }

  printSupervision(supervision: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour imprimer.');
      return;
    }

    const s = supervision;
    const dateFormatted = s.date.toLocaleDateString('fr-FR');
    const startTimeFormatted = s.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const endTimeFormatted = s.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const supervisorSig = s.signatures?.supervisor ? `<img src="${s.signatures.supervisor}" style="max-height: 50px; display: block; margin: 0 auto;">` : '<div style="font-style: italic; color: #94a3b8;">Non signé</div>';
    const teacherSig = s.signatures?.teacher ? `<img src="${s.signatures.teacher}" style="max-height: 50px; display: block; margin: 0 auto;">` : '<div style="font-style: italic; color: #94a3b8;">Non signé</div>';

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fiche de Supervision - ${dateFormatted}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; max-width: 800px; margin: 0 auto; }
          h1 { text-align: center; color: #0f42a5; margin-bottom: 5px; font-size: 24px; }
          h2 { text-align: center; font-size: 14px; font-weight: normal; color: #64748b; margin-top: 0; margin-bottom: 30px; }
          .section { margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
          .section-header { background-color: #f8fafc; padding: 10px 15px; font-weight: bold; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; }
          .section-body { padding: 15px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .field { margin-bottom: 10px; }
          .label { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 2px; }
          .value { font-size: 14px; font-weight: 500; }
          .rating-list { list-style: none; padding: 0; margin: 0; }
          .rating-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #e2e8f0; }
          .rating-item:last-child { border-bottom: none; }
          .observation { background-color: #f8fafc; padding: 15px; border-radius: 6px; font-style: italic; white-space: pre-wrap; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 40px; }
          .signature-box { border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; }
          .signature-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; margin-bottom: 10px; display: block; }
          @media print {
            body { padding: 0; }
            .section { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <h1>Rapport de Supervision</h1>
        <h2>Université Virtuelle - Réf: #${s.id.toString().substring(0, 8)} ${s.sessionNumber ? '- Séance N°' + s.sessionNumber : ''}</h2>

        <div class="section">
          <div class="section-header">Informations Générales</div>
          <div class="section-body">
            <div class="grid">
              <div class="field">
                <div class="label">Enseignant</div>
                <div class="value">${s.teacher.name}</div>
              </div>
              <div class="field">
                <div class="label">Date & Heure</div>
                <div class="value">${dateFormatted} | ${startTimeFormatted} - ${endTimeFormatted}</div>
              </div>
              <div class="field">
                <div class="label">Module / UE</div>
                <div class="value">${s.course.name}</div>
              </div>
              <div class="field">
                <div class="label">Niveau</div>
                <div class="value">${s.teacher.department}</div>
              </div>
              <div class="field">
                <div class="label">Plateforme</div>
                <div class="value">${s.platform}</div>
              </div>
              <div class="field">
                 <div class="label">Participation</div>
                 <div class="value">${s.presentCount} Présents / ${s.totalStudents} Inscrits</div>
              </div>
            </div>
            
            ${s.sessionNumber ? `
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px dashed #e2e8f0; text-align: center;">
                <span style="font-size: 16px; font-weight: bold; color: #0f42a5; text-transform: uppercase;">Séance N°${s.sessionNumber}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <div class="grid">
            <div class="section">
              <div class="section-header">Aspects Techniques</div>
              <div class="section-body">
                <ul class="rating-list">
                  <li class="rating-item"><span>Connexion Internet</span> <b>${s.technical?.internet || '-'}</b></li>
                  <li class="rating-item"><span>Qualité Audio/Vidéo</span> <b>${s.technical?.audioVideo || '-'}</b></li>
                  <li class="rating-item"><span>Ponctualité</span> <b>${s.technical?.punctuality || '-'}</b></li>
                </ul>
              </div>
            </div>

            <div class="section">
              <div class="section-header">Aspects Pédagogiques</div>
              <div class="section-body">
                <ul class="rating-list">
                  <li class="rating-item"><span>Objectifs Clairs</span> <b>${s.pedagogical?.objectives || '-'}</b></li>
                  <li class="rating-item"><span>Maîtrise Contenu</span> <b>${s.pedagogical?.contentMastery || '-'}</b></li>
                  <li class="rating-item"><span>Interaction</span> <b>${s.pedagogical?.interaction || '-'}</b></li>
                  <li class="rating-item"><span>Usage Outils</span> <b>${s.pedagogical?.toolsUsage || '-'}</b></li>
                </ul>
              </div>
            </div>
        </div>

        <div class="section">
          <div class="section-header">Observations & Remarques</div>
          <div class="section-body">
            <div class="observation">${s.observations || 'Aucune observation.'}</div>
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            <span class="signature-title">Superviseur (${s.supervisorName})</span>
            ${supervisorSig}
          </div>
          <div class="signature-box">
             <span class="signature-title">Enseignant (${s.teacher.name})</span>
             ${teacherSig}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #94a3b8;">
            Généré le ${new Date().toLocaleString('fr-FR')} via SupervisionVisio App
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }



  private getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  private getRandomColor(name: string): string {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
      'bg-teal-100 text-teal-600'
    ];
    if (!name) return colors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  private getPlatformIcon(platform: string): string {
    if (!platform) return 'videocam_off';
    const p = platform.toLowerCase();
    if (p.includes('zoom')) return 'videocam';
    if (p.includes('teams')) return 'group_work'; // or video_camera_front
    if (p.includes('meet')) return 'video_camera_front'; // google meet
    return 'videocam';
  }

  private getPlatformColor(platform: string): string {
    if (!platform) return 'text-slate-500';
    const p = platform.toLowerCase();
    if (p.includes('zoom')) return 'text-blue-500';
    if (p.includes('teams')) return 'text-purple-500';
    if (p.includes('meet')) return 'text-green-500';
    return 'text-slate-500';
  }
}