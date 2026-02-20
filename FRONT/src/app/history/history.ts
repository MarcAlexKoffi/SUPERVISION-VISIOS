import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './history.html',
  styleUrl: './history.scss',
})
export class HistoryComponent implements OnInit {
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

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    const historyStr = localStorage.getItem('supervisionHistory');
    const uesStr = localStorage.getItem('ues');
    let uesTeachers: string[] = [];
    let uesCourses: string[] = [];

    // Load available UEs to populate filters
    if (uesStr) {
      try {
        const ues = JSON.parse(uesStr);
        uesTeachers = ues.map((ue: any) => ue.responsible).filter((t: any) => t);
        uesCourses = ues.map((ue: any) => ue.name).filter((c: any) => c);
      } catch (e) {
        console.error('Failed to load UEs', e);
      }
    }

    if (historyStr) {
      try {
        const rawHistory = JSON.parse(historyStr);
        this.supervisions = rawHistory.map((item: any) => this.mapToView(item));
        
        // Extract unique teachers and courses for filter dropdowns form both history and UEs definitions
        const historyTeachers = this.supervisions.map(s => s.teacher.name);
        const historyCourses = this.supervisions.map(s => s.course.name);

        this.teachers = [...new Set([...historyTeachers, ...uesTeachers])].sort();
        this.courses = [...new Set([...historyCourses, ...uesCourses])].sort();
        
        this.applyFilters();
      } catch (e) {
        console.error('Failed to load history', e);
        this.supervisions = [];
        // Apply filters from UEs even if history load fails
        this.teachers = [...new Set(uesTeachers)].sort();
        this.courses = [...new Set(uesCourses)].sort();
      }
    } else {
        this.supervisions = [];
        // If no history, still populate filters from UEs
        this.teachers = [...new Set(uesTeachers)].sort();
        this.courses = [...new Set(uesCourses)].sort();
    }
  }

  applyFilters() {
    this.filteredSupervisions = this.supervisions.filter(s => {
      const matchTeacher = !this.filters.teacher || s.teacher.name === this.filters.teacher;
      const matchCourse = !this.filters.course || s.course.name === this.filters.course;
      
      let matchDate = true;
      if (this.filters.startDate) {
        matchDate = matchDate && new Date(s.date) >= new Date(this.filters.startDate);
      }
      if (this.filters.endDate) {
        // Add one day to include the end date fully
        const end = new Date(this.filters.endDate);
        end.setHours(23, 59, 59, 999);
        matchDate = matchDate && new Date(s.date) <= end;
      }

      return matchTeacher && matchCourse && matchDate;
    });
    
    this.currentPage = 1; // Reset to page 1 on filter change
  }

  get paginatedSupervisions() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredSupervisions.slice(start, start + this.itemsPerPage);
  }

  get totalPages() {
    return Math.ceil(this.filteredSupervisions.length / this.itemsPerPage);
  }
  
  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  exportCSV() {
    if (this.filteredSupervisions.length === 0) return;

    const headers = ['Date', 'Heure Debut', 'Heure Fin', 'Enseignant', 'UE/Module', 'Plateforme', 'Statut'];
    const rows = this.filteredSupervisions.map(s => [
      s.date.toLocaleDateString(),
      s.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      s.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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
    link.setAttribute("download", `supervisions_export_${new Date().toISOString().slice(0,10)}.csv`);
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
    const startTimeFormatted = s.date.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
    const endTimeFormatted = s.endTime.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});

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
        <h2>Université Virtuelle - Réf: #${s.id.toString().substring(0, 8)}</h2>

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

  private mapToView(data: any): any {
    // Construct Date objects
    const dateStr = data.date;
    const startDateTime = new Date(`${dateStr}T${data.startTime || '00:00'}`);
    const endDateTime = new Date(`${dateStr}T${data.endTime || '00:00'}`);

    return {
      id: data.id || Math.floor(Math.random() * 10000), // Random ID if missing
      originalData: data, // Keep the full original object reference
      date: startDateTime,
      endTime: endDateTime,
      startTimeStr: data.startTime,
      endTimeStr: data.endTime,
      teacher: {
        name: data.teacherName || 'Non spécifié',
        department: data.level || 'Niveau non spécifié',
        initials: this.getInitials(data.teacherName),
        color: this.getRandomColor(data.teacherName)
      },
      course: {
        code: 'UE', 
        name: data.module || 'Non spécifié'
      },
      platform: data.platform || 'Autre',
      platformIcon: this.getPlatformIcon(data.platform),
      platformColor: this.getPlatformColor(data.platform),
      status: 'Terminé',
      statusColor: 'bg-green-100 text-green-700',
      
      // Extended fields for details view
      presentCount: data.presentCount || 0,
      totalStudents: data.totalStudents || 0,
      technical: data.technical || {},
      pedagogical: data.pedagogical || {},
      observations: data.observations || '',
      supervisorName: data.supervisorName || '',
      signatures: data.signatures || {}
    };
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
