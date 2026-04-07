import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { SupervisionService } from '../services/supervision.service';
import { AsyncSupervisionService } from '../services/async-supervision.service'; // Import Service
import { AuthService } from '../services/auth.service';
import { TeacherService } from '../services/teacher.service';
import { UeService } from '../services/ue.service';
import { ToastService } from '../services/toast.service';
import { Subscription } from 'rxjs';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';
import { parseDate } from '../shared/utils/date.utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

  activeTab: 'synchrone' | 'asynchrone' = 'synchrone';
  asyncSupervisions: any[] = [];
  filteredAsyncSupervisions: any[] = [];
  
  supervisions: any[] = [];
  filteredSupervisions: any[] = [];

  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  Math = Math; // Expose Math to template

  // Filters Options
  teachers: string[] = [];
  courses: string[] = [];
  
  // Teachers data for email lookup
  teachersData: any[] = [];
  uesData: any[] = [];

  // Modal
  selectedSupervision: any = null;
  selectedAsyncSupervision: any = null;
  showAsyncModal: boolean = false;
  filteredHistoryForUE: any[] = [];
  showModal = false;

  // Email Modal
  showEmailModal = false;
  emailToConfirm = '';
  supervisionToSend: any = null;
  isSendingEmail = false;

  // Actions Menu
  activeMenuId: string | null = null;

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
    private asyncSupervisionService: AsyncSupervisionService,
    private authService: AuthService,
    private teacherService: TeacherService,
    private ueService: UeService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.currentUser = this.authService.currentUserValue;
    this.isAdmin = this.currentUser?.role === 'admin';
    this.loadHistory();
    this.loadAsyncHistory();
    this.loadTeachers();
    this.loadUes();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadUes() {
    this.ueService.getAll().subscribe({
      next: (data) => this.uesData = data,
      error: () => console.error('Error loading UEs for lookup')
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
      next: (data) => this.teachersData = data,
      error: () => console.error('Error loading teachers for email lookup')
    });
  }

  editSupervision(supervision: any) {
    this.activeMenuId = null;
    // Navigate to supervision-form with an ID parameter or state
    this.router.navigate(['/admin/supervision-form'], { queryParams: { id: supervision.id } });
  }
  

  openEmailModal(supervision: any) {
    // 1. Find Teacher Email logic
    let teacherEmail = '';
    
    // Try to find via teacher_id in original data
    if (supervision.originalData?.teacher_id) {
        const teacher = this.teachersData.find(t => t.id === supervision.originalData.teacher_id);
        if (teacher && teacher.email) {
            teacherEmail = teacher.email;
        }
    }
    
    // Set state
    this.supervisionToSend = supervision;
    this.emailToConfirm = teacherEmail || '';
    this.showEmailModal = true;
    
    this.activeMenuId = null; // Close menu if open
  }

  cancelEmailModal() {
    this.showEmailModal = false;
    this.supervisionToSend = null;
    this.emailToConfirm = '';
    this.isSendingEmail = false;
  }

  async confirmSendReport() {
    if (!this.emailToConfirm.trim()) {
        this.toastService.error("L'adresse email est requise.");
        return;
    }

    const supervision = this.supervisionToSend;
    if (!supervision || !supervision.id) {
        console.error('Supervision ID manquante:', supervision);
        this.toastService.error("Erreur interne : ID de supervision manquant.");
        return;
    }

    const teacherEmail = this.emailToConfirm.trim();
    
    this.isSendingEmail = true;

    try {
        const pdfBase64 = supervision.week ? await this.generateAsyncReportPDF(supervision) : await this.generateReportPDF(supervision); // Assume this method exists or is imported
        
        console.log(`Envoi du rapport pour ID=${supervision.id} à ${teacherEmail}`);

        this.supervisionService.sendReport(supervision.id, {
            pdfBase64: pdfBase64.split(',')[1],
            teacherEmail: teacherEmail,
            subject: supervision.week ? `Rapport Supervision Asynchrone - ${supervision.week}` : `Rapport de Supervision - ${supervision.course?.name || 'Visio'} - ${new Date(supervision.date).toLocaleDateString()}`,
            message: `Bonjour ${supervision.teacher?.name},\n\nVeuillez trouver ci-joint le rapport de supervision concernant la séance du ${new Date(supervision.date).toLocaleDateString()}.\n\nCordialement,\nL'Administration`
        }).subscribe({
            next: () => {
                this.toastService.success("Rapport envoyé avec succès !");
                this.cancelEmailModal();
            },
            error: (err) => {
                console.error(err);
                this.toastService.error("Erreur lors de l'envoi du rapport.");
                this.isSendingEmail = false;
            }
        });

    } catch (e) {
        console.error(e);
        this.toastService.error("Erreur lors de la génération du PDF.");
        this.isSendingEmail = false;
    }
  }

  // --- Action Menu Logic ---
  toggleActionMenu(event: Event, id: string) {
    event.stopPropagation();
    this.activeMenuId = this.activeMenuId === id ? null : id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Close menu when clicking outside
    if (this.activeMenuId) {
      this.activeMenuId = null;
    }
  }


  async generateReportPDF(s: any): Promise<string> {
      const doc = new jsPDF();
      
      // -- Header --
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 66, 165); // #0f42a5
      doc.text("FICHE DE SUPERVISION", 105, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text("Séance de visioconférence / Classe virtuelle", 105, 28, { align: 'center' });
      
      // -- General Info Box --
      let y = 50;
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, 182, 45, 3, 3);
      
      doc.setFontSize(10);
      doc.setTextColor(50);
      
      // Left Col
      doc.setFont('helvetica', 'bold');
      doc.text("Enseignant:", 20, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(s.teacher?.name || '-', 50, y + 10);
      
      doc.setFont('helvetica', 'bold');
      doc.text("UE / Module:", 20, y + 20);
      doc.setFont('helvetica', 'normal');
      const moduleName = s.course?.name || '-';
      // Truncate if too long
      const splitModule = doc.splitTextToSize(moduleName, 120);
      doc.text(splitModule, 50, y + 20);
      
      doc.setFont('helvetica', 'bold');
      doc.text("Classe:", 20, splitModule.length > 1 ? y + 35 : y + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(s.teacher?.department || '-', 50, splitModule.length > 1 ? y + 35 : y + 30);

      // Right Col
      const xRight = 120;
      doc.setFont('helvetica', 'bold');
      doc.text("Date:", xRight, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(s.date).toLocaleDateString('fr-FR'), xRight + 30, y + 10);
      
      doc.setFont('helvetica', 'bold');
      doc.text("Heure:", xRight, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(`${s.startTimeStr} - ${s.endTimeStr}`, xRight + 30, y + 20);

      doc.setFont('helvetica', 'bold');
      doc.text("Plateforme:", xRight, splitModule.length > 1 ? y + 35 : y + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(s.platform || '-', xRight + 30, splitModule.length > 1 ? y + 35 : y + 30);

      y += 55;

      // -- Technical --
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 66, 165);
      doc.text("1. Aspects Techniques & Logistiques", 14, y);
      y += 5;

      const techData = [
          ["Connexion internet (stabilité)", this.formatEval(s.originalData.tech_internet || s.originalData.technical?.internet)],
          ["Qualité audio et vidéo", this.formatEval(s.originalData.tech_audio_video || s.originalData.technical?.audioVideo)],
          ["Ponctualité (démarrage/fin)", this.formatEval(s.originalData.tech_punctuality || s.originalData.technical?.punctuality)]
      ];

      autoTable(doc, {
          startY: y,
          head: [['Critères', 'Évaluation']],
          body: techData,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 'auto', halign: 'center' } }
      });

      y = (doc as any).lastAutoTable.finalY + 15;

      // -- Pedagogical --
      doc.setFontSize(12);
      doc.setTextColor(15, 66, 165);
      doc.text("2. Aspects Pédagogiques", 14, y);
      y += 5;

      const pedData = [
          ["Clarté des objectifs", this.formatEval(s.originalData.ped_objectives || s.originalData.pedagogical?.objectives)],
          ["Maîtrise du contenu", this.formatEval(s.originalData.ped_content_mastery || s.originalData.pedagogical?.contentMastery)],
          ["Interaction étudiants", this.formatEval(s.originalData.ped_interaction || s.originalData.pedagogical?.interaction)],
          ["Utilisation outils", this.formatEval(s.originalData.ped_tools_usage || s.originalData.pedagogical?.toolsUsage)]
      ];

      autoTable(doc, {
          startY: y,
          head: [['Critères', 'Évaluation']],
          body: pedData,
          theme: 'grid',
          headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 'auto', halign: 'center' } }
      });
      
      y = (doc as any).lastAutoTable.finalY + 15;

      // -- Observations -- 
      // Check for page break space
      if (y > 240) {
          doc.addPage();
          y = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(15, 66, 165);
      doc.text("Observations & Recommandations", 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(50);
      doc.setFont('helvetica', 'normal');
      const obs = s.originalData.observations || "Aucune observation particulière.";
      const splitObs = doc.splitTextToSize(obs, 180);
      doc.text(splitObs, 14, y);
      
      y += (splitObs.length * 5) + 20;

      // -- Signatures --
      if (y > 220) {
          doc.addPage();
          y = 20;
      }
      
      // Line separator
      doc.setDrawColor(200);
      doc.line(14, y, 196, y);
      y += 10;

      doc.setFontSize(10);
      doc.setTextColor(100);
      
      // Supervisor Sig
      doc.text("Le Superviseur", 30, y);
      doc.text(s.originalData.supervisor_name || "Date et Signature", 30, y + 5);
      if (s.originalData.supervisor_signature) {
          try {
              doc.addImage(s.originalData.supervisor_signature, 'PNG', 30, y + 10, 40, 20);
          } catch (e) { console.warn('Error adding sup signature', e); }
      }

      // Teacher Sig
      doc.text("L'Enseignant", 130, y);
      doc.text("Lu et pris connaissance", 130, y + 5);
      if (s.originalData.teacher_signature) {
          try {
             doc.addImage(s.originalData.teacher_signature, 'PNG', 130, y + 10, 40, 20);
          } catch (e) { console.warn('Error adding teacher signature', e); }
      }

      // Footer
      const pageCount = (doc as any).internal.getNumberOfPages();
      for(let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(`Généré le ${new Date().toLocaleDateString()} - Page ${i}/${pageCount}`, 105, 290, { align: 'center' });
      }

      return doc.output('datauristring');
  }

  formatEval(val: string): string {
      if (!val) return '-';
      const map: any = {
          'conforme': 'Conforme', 'a_ameliorer': 'À améliorer', 'non_conforme': 'Non Conforme',
          'excellent': 'Excellent', 'satisfaisant': 'Satisfaisant', 'insuffisant': 'Insuffisant'
      };
      return map[val] || val;
  }
  
  exportCSV() {
    if (this.filteredSupervisions.length === 0) return;
    
    const data = this.filteredSupervisions.map(s => ({
      Date: new Date(s.date).toLocaleDateString(),
      Heure_Debut: s.startTimeStr,
      Heure_Fin: s.endTimeStr,
      Enseignant: s.teacher.name,
      Departement: s.teacher.department,
      Cours: s.course.name,
      Code_UE: s.course.code,
      Plateforme: s.platform,
      Connexion: this.formatEval(s.originalData.tech_internet || s.originalData.technical?.internet),
      Audio_Video: this.formatEval(s.originalData.tech_audio_video || s.originalData.technical?.audioVideo),
      Ponctualité: this.formatEval(s.originalData.tech_punctuality || s.originalData.technical?.punctuality),
      Objectifs: this.formatEval(s.originalData.ped_objectives || s.originalData.pedagogical?.objectives),
      Maitrise_Contenu: this.formatEval(s.originalData.ped_content_mastery || s.originalData.pedagogical?.contentMastery),
      Interaction: this.formatEval(s.originalData.ped_interaction || s.originalData.pedagogical?.interaction),
      Outils: this.formatEval(s.originalData.ped_tools_usage || s.originalData.pedagogical?.toolsUsage),
      Superviseur: s.originalData.supervisor_name
    }));

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const cell = (row as any)[header] || '';
        return `"${cell.toString().replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `supervisions_export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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

  
  loadAsyncHistory() {
    this.subscriptions.add(
      this.asyncSupervisionService.getAll().subscribe({
        next: (data) => {
          this.asyncSupervisions = data;
          this.filteredAsyncSupervisions = [...this.asyncSupervisions];
        },
        error: (err: any) => console.error("Erreur chargement Async Supervisions", err)
      })
    );
  }

  get printAsyncSupervisions(): any[] {
    return [...this.filteredAsyncSupervisions].map(s => {
      const teacher = this.teachersData?.find(t => t.id === s.teacher_id);
      return {
        ...s,
        teacher_name: teacher ? (teacher.name || teacher.first_name + ' ' + teacher.last_name) : s.teacher_id,
        ue_name: s.ue_id
      };
    });
  }


  loadHistory() {
    // Call API instead of localStorage
    const userId = !this.isAdmin && this.currentUser ? this.currentUser.id : undefined;
    
    this.supervisionService.getAll(userId).subscribe({
      next: (data) => {
        console.log('Raw History Data:', data);
        this.supervisions = data.map((item: any) => this.mapToView(item));
        console.log('Mapped History Data:', this.supervisions);
        this.updateFilters();
        this.applyFilters();
        this.cdr.detectChanges(); // Force update just in case
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
    let teacherName = data.teacher?.name || data.teacher_name || data.teacherName || 'Non spécifié';
    if (data.teacher_firstname && data.teacher_lastname) {
      teacherName = `${data.teacher_firstname} ${data.teacher_lastname}`;
    }

    // Correction nom enseignant (avec trim pour éviter les erreurs d'espace)
    if (teacherName && teacherName.trim() === 'Mireille Bobi') {
      teacherName = 'Mireille Bobi Epse Tah';
    }

    let moduleName = data.ue?.name || data.module || 'Non spécifié';
    // If we have relate UE data, prioritize it
    if (data.ue?.code) {
       moduleName = `${data.ue.code} - ${moduleName}`;
    } else if (data.ue_real_name) {
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

    let dateObj = parseDate(dateStr);

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
      date: dateObj, // Keep just the date part for filtering/sorting if needed, or full datetime
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
      createdAt: parseDate(data.created_at) // Utilisation de parseDate pour gérer les Timestamps
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
    this.activeMenuId = null;
    this.supervisionToDelete = supervision;
    this.showDeleteModal = true;
  }

  deleteAsync(supervision: any) {
    this.supervisionToDelete = supervision;
    this.showDeleteModal = true;
  }




  confirmDelete() {
    if (!this.supervisionToDelete) return;

    if (this.activeTab === 'synchrone') {
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
    } else {
      this.asyncSupervisionService.delete(this.supervisionToDelete.id).subscribe({
        next: () => {
          this.asyncSupervisions = this.asyncSupervisions.filter(s => s.id !== this.supervisionToDelete.id);
          this.filteredAsyncSupervisions = [...this.asyncSupervisions];
          this.cancelDelete();
        },
        error: (err) => {
          console.error('Error deleting async supervision', err);
          if (err.code === 'permission-denied') {
            alert('Vous n\'avez pas les droits pour supprimer cet enregistrement.');
          } else {
            alert('Erreur lors de la suppression');
          }
          this.cancelDelete();
        }
      });
    }
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.supervisionToDelete = null;
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

  viewAsyncDetails(supervision: any) {
    this.selectedAsyncSupervision = supervision;
    this.showAsyncModal = true;
  }

  closeAsyncModal() {
    this.showAsyncModal = false;
    this.selectedAsyncSupervision = null;
  }

  editAsyncSupervision(supervision: any) {
    this.activeMenuId = null;
    this.router.navigate(['/admin/async-supervision'], { queryParams: { id: supervision.id } });
  }

  openAsyncEmailModal(supervision: any) {
    let teacherEmail = '';
    const teacherId = supervision.teacher_id || supervision.teacherId;
    if (teacherId) {
        const teacher = this.teachersData?.find(t => t.id === teacherId);
        if (teacher && teacher.email) {
            teacherEmail = teacher.email;
        }
    }
    this.supervisionToSend = supervision;
    this.emailToConfirm = teacherEmail || '';
    this.showEmailModal = true;
    this.activeMenuId = null;
  }

  async generateAsyncReportPDF(s: any): Promise<string> {
      const doc = new jsPDF();
      
      // -- Header --
      doc.setFillColor(248, 250, 252);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 66, 165); // #0f42a5
      doc.text("FICHE DE SUPERVISION ASYNCHRONE", 105, 20, { align: 'center' });
      
      // -- General Info Box --
      let y = 50;
      doc.setDrawColor(200);
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(14, y, 182, 45, 3, 3, 'FD');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Informations GÃ©nÃ©rales", 20, y + 10);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      
      const teacherName = s.teacher_name || s.teacherId || 'Non spÃ©cifiÃ©';
      const ueName = s.ue_id || s.ueId || s.ue_name || 'Non spÃ©cifiÃ©';

      doc.text(`Enseignant: ${teacherName}`, 20, y + 20);
      doc.text(`Module / UE: ${ueName}`, 20, y + 28);
      doc.text(`Semaine concernÃ©e: ${s.week}`, 20, y + 36);

      doc.setFont('helvetica', 'bold');
      doc.text(`Statut: ${s.status || '-'}`, 130, y + 20);
      doc.setFont('helvetica', 'normal');

      y += 55;
      
      // -- Observations --
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Observations et recommandations", 14, y);
      
      y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const obsLines = doc.splitTextToSize(s.observations || "Aucune observation n'a Ã©tÃ© signalÃ©e.", 182);
      doc.text(obsLines, 14, y);
      
      y += obsLines.length * 5 + 10;

      // -- Footer Signatures --
      y += 20;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      
      y += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("Signature Administration", 14, y);

      return doc.output('datauristring');
  }

  printAsyncSupervision(supervision: any) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Veuillez autoriser les pop-ups pour imprimer.');
      return;
    }

    const s = supervision;
    const teacherName = s.teacher_name || s.teacherId || 'N/A';
    const ueName = s.ue_id || s.ueId || s.ue_name || 'N/A';

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Fiche de Supervision Asynchrone - ${s.week}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.6; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #0f42a5; }
          .header h1 { color: #0f42a5; margin: 0 0 10px 0; font-size: 28px; text-transform: uppercase; letter-spacing: 1px; }
          .header p { color: #64748b; margin: 0; font-size: 14px; }
          .info-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
          .info-item { margin-bottom: 15px; }
          .info-label { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
          .info-value { font-size: 16px; font-weight: 600; color: #0f172a; }
          .section { margin-bottom: 30px; page-break-inside: avoid; }
          .section-title { font-size: 18px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px; }
          .observations-box { background-color: white; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 6px; min-height: 100px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px; page-break-inside: avoid; }
          .signature-box { border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-weight: bold; color: #475569; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fiche de Supervision Asynchrone</h1>
          <p>Document officiel certifiant la vÃ©rification de suivi asynchrone</p>
        </div>
        
        <div class="info-box">
          <div class="info-item">
            <div class="info-label">Enseignant</div>
            <div class="info-value">${teacherName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Statut</div>
            <div class="info-value" style="color: ${s.status === 'Fait' ? '#16a34a' : (s.status === 'Partiel' ? '#ca8a04' : '#dc2626')}">${s.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Modue / UE</div>
            <div class="info-value">${ueName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">PÃ©riode / Semaine</div>
            <div class="info-value">${s.week}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Observations et recommandations</div>
          <div class="observations-box">
            ${s.observations ? s.observations.replace(/\n/g, '<br>') : '<span style="color:#94a3b8;font-style:italic;">Aucune observation n\'a Ã©tÃ© rÃ©digÃ©e pour cette supervision.</span>'}
          </div>
        </div>

        <div class="signatures">
          <div class="signature-box">
            Administration
          </div>
          <div class="signature-box">
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  }

}