import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService, Planning } from '../services/planning.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { ToastService } from '../services/toast.service';
import { ParcoursService } from '../services/parcours.service';
import { ClasseService } from '../services/classe.service';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-plannings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plannings.html',
  styleUrls: ['./plannings.scss'],
})
export class Plannings implements OnInit {
  @ViewChild('calendarPdfArea') calendarPdfArea!: ElementRef;

  // Filters
  parcoursList: string[] = [];
  selectedParcours = '';
  selectedStatus = '';

  // Dates
  currentDate = new Date();
  weekStart = startOfWeek(this.currentDate, { weekStartsOn: 1 });
  weekEnd = endOfWeek(this.currentDate, { weekStartsOn: 1 });

  // Data
  plannings: Planning[] = [];
  teachers: any[] = [];
  ues: any[] = [];
  databaseClasses: any[] = [];

  // View State
  currentView: 'supervisor' | 'calendar' = 'supervisor';

  // Modal State
  isAddModalOpen = false;
  isEditMode = false;
  isActivityMode = false; // New flag
  modalData: Partial<Planning> = this.getEmptyPlanning();

  daysOfWeek: Date[] = [];
  calendarHours = Array.from({ length: 14 }, (_, i) => i + 8); // 8:00 to 21:00

  constructor(
    private planningService: PlanningService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private toastService: ToastService,
    private parcoursService: ParcoursService,
    private classeService: ClasseService
  ) {}

  ngOnInit() {
    this.updateDaysOfWeek();
    this.loadUesAndTeachers();
    this.loadParcours();
  }

  loadParcours() {
    this.parcoursService.getAll().subscribe({
      next: (data) => {
        this.parcoursList = data.map(p => p.name);
        if (this.parcoursList.length > 0 && !this.selectedParcours) {
            this.selectedParcours = this.parcoursList[0];
            this.loadPlannings();
        }
      },
      error: () => this.toastService.error('Erreur lors du chargement des parcours')
    });
  }

  getEmptyPlanning(): Partial<Planning> {
    return {
      parcours: this.selectedParcours,
      session_type: 'CM',
      status: 'À superviser',
    };
  }

  loadUesAndTeachers() {
    this.ueService.getAll().subscribe({
      next: (data) => (this.ues = data),
      error: () => this.toastService.error('Erreur de chargement des UEs'),
    });
    this.teacherService.getAll().subscribe({
      next: (data) => (this.teachers = data),
      error: () => this.toastService.error('Erreur de chargement des enseignants'),
    });
    this.classeService.getAll().subscribe({
      next: (data) => (this.databaseClasses = data),
      error: () => this.toastService.error('Erreur de chargement des classes'),
    });
  }

  loadPlannings() {
    const filters = {
      parcours: this.selectedParcours,
      startDate: format(this.weekStart, 'yyyy-MM-dd'),
      endDate: format(this.weekEnd, 'yyyy-MM-dd'),
      ...(this.selectedStatus ? { status: this.selectedStatus } : {}),
    };

    this.planningService.getPlannings(filters).subscribe({
      next: (data) => (this.plannings = data),
      error: () => this.toastService.error('Erreur lors du chargement des plannings'),
    });
  }

  getPlanningsForDay(day: Date): Planning[] {
    return this.plannings.filter((p) => p.date && isSameDay(parseISO(p.date), day));
  }

  formatDateHeader(date: Date): { dayName: string; dayDate: string } {
    return {
      dayName: format(date, 'EEEE', { locale: fr }),
      dayDate: format(date, 'dd MMM', { locale: fr }),
    };
  }

  getWeekLabel(): string {
    return `${format(this.weekStart, 'dd MMM', { locale: fr })} - ${format(this.weekEnd, 'dd MMM yyyy', { locale: fr })}`;
  }

  updateDaysOfWeek() {
    this.daysOfWeek = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(this.weekStart);
      day.setDate(day.getDate() + i);
      this.daysOfWeek.push(day);
    }
  }

  previousWeek() {
    this.weekStart = subWeeks(this.weekStart, 1);
    this.weekEnd = subWeeks(this.weekEnd, 1);
    this.updateDaysOfWeek();
    this.loadPlannings();
  }

  nextWeek() {
    this.weekStart = addWeeks(this.weekStart, 1);
    this.weekEnd = addWeeks(this.weekEnd, 1);
    this.updateDaysOfWeek();
    this.loadPlannings();
  }

  onFilterChange() {
    this.loadPlannings();
  }

  openAddModal() {
    this.isEditMode = false;
    this.isActivityMode = false;
    this.modalData = this.getEmptyPlanning();
    this.modalData.date = format(
      this.weekStart <= new Date() && this.weekEnd >= new Date() ? new Date() : this.weekStart,
      'yyyy-MM-dd',
    );
    this.isAddModalOpen = true;
  }

  openAddActivityModal() {
    this.isEditMode = false;
    this.isActivityMode = true;
    this.modalData = this.getEmptyPlanning();
    this.modalData.ue_id = null; // Explicitly null
    this.modalData.date = format(
      this.weekStart <= new Date() && this.weekEnd >= new Date() ? new Date() : this.weekStart,
      'yyyy-MM-dd',
    );
    this.isAddModalOpen = true;
  }

  openEditModal(planning: Planning) {
    this.isEditMode = true;
    this.modalData = { ...planning };
    // Determine mode based on data
    this.isActivityMode = !this.modalData.ue_id && !!this.modalData.title;
    
    // Cut off seconds from time if it exists (e.g. HH:MM:SS -> HH:MM)
    if (this.modalData.start_time && this.modalData.start_time.length > 5) {
      this.modalData.start_time = this.modalData.start_time.substring(0, 5);
    }
    if (this.modalData.end_time && this.modalData.end_time.length > 5) {
      this.modalData.end_time = this.modalData.end_time.substring(0, 5);
    }
    // format date as YYYY-MM-DD
    if (this.modalData.date && this.modalData.date.includes('T')) {
      this.modalData.date = this.modalData.date.split('T')[0];
    }
    this.isAddModalOpen = true;
  }

  closeModal() {
    this.isAddModalOpen = false;
  }

  savePlanning() {
    // Validate either UE or Title provided
    if ((!this.modalData.ue_id && !this.modalData.title) || 
        !this.modalData.teacher_id || 
        !this.modalData.date || 
        !this.modalData.end_time ||
        !this.modalData.parcours) {
      this.toastService.error('Veuillez sélectionner une UE ou entrer un titre, et remplir les autres champs.');
      return;
    }

    // If start time is missing, default it to end time (0 duration) or empty if safe
    if (!this.modalData.start_time) {
        this.modalData.start_time = this.modalData.end_time;
    }

    if (this.isEditMode && this.modalData.id) {
      this.planningService.updatePlanning(this.modalData.id, this.modalData).subscribe({
        next: () => {
          this.toastService.success('Séance mise à jour');
          this.closeModal();
          this.loadPlannings();
        },
        error: () => this.toastService.error('Erreur lors de la mise à jour'),
      });
    } else {
      this.planningService.createPlanning(this.modalData as Planning).subscribe({
        next: () => {
          this.toastService.success('Séance ajoutée au planning');
          this.closeModal();
          this.loadPlannings();
        },
        error: () => this.toastService.error("Erreur lors de l'ajout de la séance"),
      });
    }
  }

  deletePlanning(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cette séance ?')) {
      this.planningService.deletePlanning(id).subscribe({
        next: () => {
          this.toastService.success('Séance supprimée');
          this.loadPlannings();
        },
        error: () => this.toastService.error('Erreur de suppression'),
      });
    }
  }

  changeStatus(planning: Planning, newStatus: Event | any) {
    const statusValue = (newStatus.target as HTMLSelectElement).value;
    this.planningService.updatePlanning(planning.id!, { status: statusValue as any }).subscribe({
      next: () => {
        planning.status = statusValue as any;
        this.toastService.success('Statut mis à jour');
      },
      error: () => this.toastService.error('Erreur lors de la mise à jour du statut'),
    });
  }

  // Exports and Print
  printSchedule() {
    window.print();
  }

  async exportPDF() {
    if (this.currentView === 'calendar') {
      this.toastService.success('Génération du PDF en cours...', 'Veuillez patienter');
      try {
        const doc = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4' // 297 width x 210 height
        });

        // Margins and dimensions
        const marginLeft = 10;
        const marginTop = 10;
        const pageWidth = 297;
        const pageHeight = 210;
        
        const gridX = marginLeft;
        const gridY = 30; // space for header
        const gridWidth = pageWidth - (marginLeft * 2);
        const gridHeight = pageHeight - gridY - 10; // extra bottom margin

        // Draw Document Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(`Planning: ${this.selectedParcours}`, marginLeft, marginTop + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(this.getWeekLabel(), marginLeft, marginTop + 12);

        // Variables for the Grid
        const daysCount = 7;
        const colWidth = gridWidth / daysCount;
        
        // Define day start and end time limits
        const startHour = 8;
        const endHour = 21;
        const totalHours = endHour - startHour;
        const rowHeight = gridHeight / totalHours;

        // Draw Day columns and headers
        doc.setFontSize(9);
        for (let i = 0; i < daysCount; i++) {
           const dayTextX = gridX + (i * colWidth);
           // Col Header Box
           doc.setDrawColor(226, 232, 240); // slate-200
           doc.setFillColor(248, 250, 252); // slate-50
           doc.rect(dayTextX, gridY - 12, colWidth, 12, 'FD');

           // Col Header Text
           const day = this.daysOfWeek[i];
           const headerInfo = this.formatDateHeader(day);
           
           doc.setFont('helvetica', 'bold');
           doc.setTextColor(100, 116, 139); // slate-500
           doc.setFontSize(8);
           const dayNameText = headerInfo.dayName.toUpperCase();
           doc.text(dayNameText, dayTextX + (colWidth / 2), gridY - 7, { align: 'center' });

           doc.setFont('helvetica', 'bold');
           doc.setTextColor(30, 41, 59); // slate-800
           doc.setFontSize(10);
           doc.text(headerInfo.dayDate, dayTextX + (colWidth / 2), gridY - 2, { align: 'center' });

           // Vert Column Lines
           if (i > 0) {
              doc.setDrawColor(226, 232, 240);
              doc.line(dayTextX, gridY, dayTextX, gridY + gridHeight);
           }
        }
        
        // Box around header and grid
        doc.setDrawColor(226, 232, 240);
        doc.rect(gridX, gridY, gridWidth, gridHeight); // Grid outer box
        doc.rect(gridX, gridY - 12, gridWidth, 12); // Header outer box

        // Draw Hour rows
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        for (let h = 0; h <= totalHours; h++) {
           const yLine = gridY + (h * rowHeight);
           const hourLabel = startHour + h;
           
           if (h > 0 && h < totalHours) {
              doc.setDrawColor(241, 245, 249); // slate-100 (light inline)
              doc.line(gridX, yLine, gridX + gridWidth, yLine);
           }
           
           // label
           if (h < totalHours) {
               // small label on left side
               doc.text(`${hourLabel}:00`, gridX + 1, yLine + 4);
           }
        }

        // Draw Cards
        const COLORS: Record<string, { bg: number[], text: number[], border: number[] }> = {
            'CM': { bg: [239, 246, 255], text: [29, 78, 216], border: [59, 130, 246] },      // blue
            'TP': { bg: [253, 244, 255], text: [162, 28, 175], border: [217, 70, 239] },    // fuchsia
            'TD': { bg: [236, 253, 245], text: [4, 120, 87], border: [16, 185, 129] },      // emerald
            'Atelier': { bg: [255, 247, 237], text: [194, 65, 12], border: [249, 115, 22] }, // orange
            'DEFAULT': { bg: [248, 250, 252], text: [71, 85, 105], border: [148, 163, 184] } // slate
        };

        const calcY = (timeStr: string) => {
            const [h, m] = timeStr.split(':').map(Number);
            const decTime = h + (m / 60);
            const clamped = Math.max(startHour, Math.min(endHour, decTime));
            const yOffset = (clamped - startHour) * rowHeight;
            return gridY + yOffset;
        };

        this.daysOfWeek.forEach((day, dayIndex) => {
            const colX = gridX + (dayIndex * colWidth);
            const items = this.getPlanningsForDay(day);

            items.forEach(plan => {
                if (!plan.start_time || !plan.end_time) return;

                const yStart = calcY(plan.start_time);
                const yEnd = calcY(plan.end_time);
                let heightCard = Math.max(10, yEnd - yStart); // min 10mm
                
                // Adjust if overflows grid bottom
                if (yStart + heightCard > gridY + gridHeight) {
                    heightCard = (gridY + gridHeight) - yStart;
                }
                
                if (heightCard <= 2) return; // Ignore very small blocks

                const padX = 1; // 1mm horizontal padding
                const cardX = colX + padX;
                const cardWidth = colWidth - (padX * 2);
                const sessionType = plan.session_type || 'DEFAULT';
                const typeColor = COLORS[sessionType] || COLORS['DEFAULT'];

                // Draw background
                doc.setFillColor(typeColor.bg[0], typeColor.bg[1], typeColor.bg[2]);
                doc.roundedRect(cardX, yStart, cardWidth, heightCard, 1, 1, 'F');
                
                // Draw left colored strip
                doc.setFillColor(typeColor.border[0], typeColor.border[1], typeColor.border[2]);
                // using a small rect for left strip instead of line to look better
                doc.rect(cardX, yStart, 1.5, heightCard, 'F'); 
                
                // Stroke border around card
                doc.setDrawColor(226, 232, 240); // slate-200
                doc.roundedRect(cardX, yStart, cardWidth, heightCard, 1, 1, 'S');

                // Internal text layout
                let textY = yStart + 3.5;
                const textMarginL = cardX + 2.5;
                const textMaxWidth = cardWidth - 3;

                // 1) Type Badge & Visio Link
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(typeColor.text[0], typeColor.text[1], typeColor.text[2]);
                
                // badge rect
                const tWidth = doc.getTextWidth(sessionType) + 2;
                doc.setFillColor(typeColor.bg[0] - 12, typeColor.bg[1] - 12, typeColor.bg[2] - 12);
                doc.roundedRect(textMarginL - 0.5, textY - 2.5, tWidth, 3.5, 0.5, 0.5, 'F');
                doc.text(sessionType, textMarginL + 0.5, textY - 0.2);

                if (plan.visio_link) {
                    const linkText = "Rejoindre la visio";
                    doc.setFontSize(6);
                    doc.setTextColor(37, 99, 235); // blue-600
                    const linkX = cardX + cardWidth - doc.getTextWidth(linkText) - 1;
                    doc.textWithLink(linkText, linkX, textY - 0.2, { url: plan.visio_link });
                    // Underline
                    doc.setDrawColor(37, 99, 235);
                    doc.line(linkX, textY, linkX + doc.getTextWidth(linkText), textY);
                }

                textY += 3.5;

                // 2) UE Name
                if (textY < yStart + heightCard - 2) {
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(15, 23, 42); // slate-900
                    const ueLines = doc.splitTextToSize(plan.ue_name || 'Sans titre', textMaxWidth);
                    
                    ueLines.forEach((line: string) => {
                        if (textY < yStart + heightCard - 2) {
                            doc.text(line, textMarginL, textY);
                            textY += 3;
                        }
                    });
                }
                
                // 3) Teacher Name
                if (textY < yStart + heightCard - 2) {
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(71, 85, 105);
                    const teacherName = `${plan.teacher_first_name} ${plan.teacher_last_name}`.trim();
                    if(teacherName !== 'undefined undefined' && teacherName !== '') {
                         const tLines = doc.splitTextToSize(teacherName, textMaxWidth);
                         tLines.forEach((line: string) => {
                            if (textY < yStart + heightCard - 2) {
                                doc.text(line, textMarginL, textY);
                                textY += 3;
                            }
                         });
                    }
                }

                // 4) Times
                if (heightCard >= 15 && (textY < yStart + heightCard - 2)) {
                    // Push to bottom of card if tall enough
                    const bottomY = yStart + heightCard - 1.5;
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(100, 116, 139); // slate-500
                    
                    const t = plan.start_time 
                        ? `${plan.start_time.substring(0,5)} - ${plan.end_time.substring(0,5)}`
                        : `Fin: ${plan.end_time.substring(0,5)}`;
                        
                    doc.text(t, textMarginL, Math.max(textY, bottomY));
                }

            });
        });

        doc.save(`planning-${this.selectedParcours.replace(/\s+/g, '-')}.pdf`);
      } catch (e) {
        console.error(e);
        this.toastService.error('Erreur lors de la génération du PDF');
      }
    } else {
      // Create a tabular PDF if not in calendar view
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Planning: ${this.selectedParcours}`, 14, 20);
      doc.setFontSize(12);
      doc.text(`Semaine: ${this.getWeekLabel()}`, 14, 30);

      const tableData = this.plannings.map((p) => {
        const timeStr = p.start_time 
          ? `${p.start_time.substring(0, 5)} - ${p.end_time.substring(0, 5)}`
          : `Date Butoir: ${p.end_time.substring(0, 5)}`;

        return [
          p.date ? format(parseISO(p.date), 'dd/MM/yyyy') : '',
          timeStr,
          p.ue_name || '',
          `${p.teacher_first_name} ${p.teacher_last_name}`,
          p.session_type || '',
          p.status || '',
        ];
      });

      autoTable(doc, {
        head: [['Date', 'Heure', 'UE', 'Enseignant', 'Type', 'Statut']],
        body: tableData,
        startY: 40,
      });

      doc.save(`planning-${this.selectedParcours}.pdf`);
    }
  }

  // Positioning logic for calendar blocks
  getTopPosition(startTime?: string): string {
    if (!startTime) return '0px';
    const [h, m] = startTime.split(':').map(Number);
    
    // Assume 8am start
    const startHour = 8;
    // Calculate pixels offset (140px per hour)
    const hoursFromStart = h - startHour + (m / 60);
    const offset = hoursFromStart * 140;

    return `${Math.max(0, offset)}px`;
  }

  getHeight(startTime?: string, endTime?: string): string {
    if (!endTime) return '140px'; 
    
    // If no start time, default to 1 hour duration or similar visually
    let startH: number, startM: number;
    let endH: number, endM: number;

    [endH, endM] = endTime.split(':').map(Number);

    if (startTime) {
        [startH, startM] = startTime.split(':').map(Number);
    } else {
        // If deadline only, maybe make it look like a 1h block ending at deadline?
        // Or make it start 1h before deadline
        startH = endH - 1; 
        startM = endM;
    }

    const pixelsPerHour = 140;

    const startOffset = startH + startM / 60;
    const endOffset = endH + endM / 60;
    
    // Minimum height of ~50 mins (0.85 hours)
    const height = Math.max(0.85, endOffset - startOffset) * pixelsPerHour;

    return `${height}px`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Supervisé':
        return 'bg-emerald-100 text-emerald-700';
      case 'Annulé':
        return 'bg-rose-100 text-rose-700';
      default:
        return 'bg-amber-100 text-amber-700'; // À superviser
    }
  }

  getStatusIconColor(status: string): string {
    switch (status) {
      case 'Supervisé':
        return 'text-emerald-500';
      case 'Annulé':
        return 'text-rose-500';
      default:
        return 'text-amber-500'; // À superviser
    }
  }
}
