import { AcademicSearchSelectComponent } from '../shared/components/academic-search-select/academic-search-select';
import { normalizeAcademicSearch, filterAcademicUes } from '../shared/utils/academic-search';
import { Component, OnInit, OnDestroy, ElementRef, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningService, Planning } from '../services/planning.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { ToastService } from '../services/toast.service';
import { ParcoursService } from '../services/parcours.service';
import { ClasseService } from '../services/classe.service';
import { NotificationService } from '../services/notification.service';
import { ActivityService } from '../services/activity.service';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format, parseISO, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Subscription, firstValueFrom } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { SupervisionService } from '../services/supervision.service';
import { sortedTeacherSchedule, validateSlot } from '../services/planning-rules';
import { parseDate } from '../shared/utils/date.utils';
import { activeEdtSessions, edtHourRange, dayKey } from '../shared/utils/edt-week';
import { exportWeeklyTimetablePdf } from '../shared/utils/edt-pdf';

@Component({
  selector: 'app-plannings',
  standalone: true,
  imports: [AcademicSearchSelectComponent,CommonModule, FormsModule],
  templateUrl: './plannings.html',
  styleUrls: ['./plannings.scss'],
})
export class Plannings implements OnInit, OnDestroy {
  @ViewChild('calendarPdfArea') calendarPdfArea!: ElementRef;
  @ViewChild('actionDialogRef') actionDialogRef?: ElementRef<HTMLElement>;

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
  
  private planningsSubscription: Subscription | null = null;

  // View State
  currentView: 'supervisor' | 'calendar' | 'teacher' = 'supervisor';
  selectedTeacherForSchedule = '';
  isSavingPlanning = false;
  isScheduleLoading = false;
  scheduleError = '';
  changeReason = '';
  actionDialog: { kind: 'delete' | 'status'; planning: Planning; targetStatus?: Planning['status']; reason: string; busy: boolean; error: string } | null = null;
  fullCalendarHours = false;
  ueSearch = '';
  classSearch = '';
  modalClassId = '';

  // AURA-V2: chaque recherche est independante et ne modifie jamais la selection
  // jusqu'a une action explicite de l'utilisateur.
  quickSearch = '';
  teacherViewQuery = '';
  teacherViewOpen = false;
  modalTeacherQuery = '';
  modalTeacherOpen = false;
  modalUeOpen = false;
  modalUeActiveIndex = 0;
  private modalTrigger: HTMLElement | null = null;
  @ViewChild('planningDialog') planningDialog?: ElementRef<HTMLElement>;

  private normalizeSearch(value: unknown): string {
    return normalizeAcademicSearch(value);
  }

  get filteredTeachers(): any[] {
    const term = this.normalizeSearch(this.modalTeacherQuery);
    return this.teachers.filter(t => !term || this.normalizeSearch(`${t.first_name} ${t.last_name} ${t.email || ''} ${t.department || ''}`).includes(term));
  }
  get filteredTeacherScheduleOptions(): any[] {
    const term = this.normalizeSearch(this.teacherViewQuery);
    return this.teachers.filter(t => !term || this.normalizeSearch(`${t.first_name} ${t.last_name} ${t.email || ''} ${t.department || ''}`).includes(term));
  }
  get filteredUes(): any[] {
    // Un champ déjà sélectionné doit rester réouvrable sans effacer sa valeur.
    if (this.selectedModalUe && this.ueSearch === this.selectedModalUeLabel) return this.ues;
    return filterAcademicUes(this.ues, this.ueSearch);
  }
  get selectedModalUe(): any | undefined {
    return this.ues.find(ue => String(ue.id) === String(this.modalData.ue_id ?? ''));
  }
  get selectedModalUeLabel(): string {
    const ue = this.selectedModalUe;
    return ue ? `${ue.code || ''} · ${ue.name || ''}`.trim() : '';
  }
  // La saisie seule ne doit jamais conserver l'ID d'une UE auparavant choisie.
  onModalUeQueryChange(value: string): void {
    this.ueSearch = value;
    if (value !== this.selectedModalUeLabel) this.modalData.ue_id = undefined;
    this.modalUeActiveIndex = 0;
    this.modalUeOpen = true;
  }
  selectModalUe(ue: any): void {
    this.modalData.ue_id = ue.id;
    this.ueSearch = `${ue.code || ''} · ${ue.name || ''}`.trim();
    this.modalUeOpen = false;
  }
  clearModalUe(): void {
    this.modalData.ue_id = undefined;
    this.ueSearch = '';
    this.modalUeActiveIndex = 0;
    this.modalUeOpen = true;
  }
  handleModalUeKeydown(event: Event): void {
    const keyboard = event as KeyboardEvent;
    if (keyboard.key === 'Escape') {
      this.modalUeOpen = false;
      keyboard.stopPropagation();
      return;
    }
    if (keyboard.key === 'ArrowDown' || keyboard.key === 'ArrowUp') {
      keyboard.preventDefault();
      this.modalUeOpen = true;
      const delta = keyboard.key === 'ArrowDown' ? 1 : -1;
      const count = this.filteredUes.length;
      this.modalUeActiveIndex = count ? (this.modalUeActiveIndex + delta + count) % count : 0;
      return;
    }
    if (keyboard.key === 'Enter' && this.modalUeOpen) {
      const ue = this.filteredUes[this.modalUeActiveIndex];
      if (ue) { keyboard.preventDefault(); this.selectModalUe(ue); }
    }
  }
  onModalTeacherQueryChange(value: string): void {
    this.modalTeacherQuery = value;
    if (value !== this.selectedModalTeacherName) this.modalData.teacher_id = undefined;
    this.modalTeacherOpen = true;
  }
  onTeacherViewQueryChange(value: string): void {
    this.teacherViewQuery = value;
    if (value !== this.teacherScheduleName) this.selectedTeacherForSchedule = '';
    this.teacherViewOpen = true;
  }
  private focusPlanningDialog(): void {
    this.modalTrigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTimeout(() => this.planningDialog?.nativeElement.focus(), 0);
  }
  onModalBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget && !this.isSavingPlanning) this.closeModal();
  }
  @HostListener('document:keydown.escape')
  onDialogEscape(): void {
    if (this.actionDialog) { this.closeActionDialog(); return; }
    if (this.modalUeOpen) { this.modalUeOpen = false; return; }
    if (this.modalTeacherOpen) { this.modalTeacherOpen = false; return; }
    if (this.isAddModalOpen && !this.isSavingPlanning) this.closeModal();
  }
  @HostListener('document:keydown.tab', ['$event'])
  keepDialogFocus(event: Event): void {
    const dialog = this.actionDialog && this.actionDialogRef
      ? this.actionDialogRef.nativeElement
      : this.isAddModalOpen && this.planningDialog
        ? this.planningDialog.nativeElement : null;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]):not([hidden]), input:not([disabled]):not([hidden]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex="0"]'
    )).filter(el => el.getClientRects().length > 0);
    if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if ((event as KeyboardEvent).shiftKey && (active === first || active === dialog)) { event.preventDefault(); last.focus(); }
    else if (!(event as KeyboardEvent).shiftKey && (active === last || !dialog.contains(active))) { event.preventDefault(); first.focus(); }
  }

  get filteredClasses(): any[] {
    const term = this.normalizeSearch(this.classSearch);
    return this.databaseClasses.filter(c => !term || this.normalizeSearch(c.name).includes(term));
  }
  get visiblePlannings(): Planning[] {
    const term = this.normalizeSearch(this.quickSearch);
    return this.plannings.filter(p => {
      // Teacher view must aggregate all of their classes, regardless of a previous class filter.
      const matchesClass = this.currentView === 'teacher' || !this.selectedParcours || p.parcours === this.selectedParcours || p.classe_name === this.selectedParcours;
      const matchesStatus = this.currentView !== 'supervisor' || !this.selectedStatus || p.status === this.selectedStatus;
      const text = `${p.ue_code || ''} ${p.ue_name || ''} ${p.title || ''} ${p.teacher_first_name || ''} ${p.teacher_last_name || ''} ${p.parcours || ''} ${p.classe_name || ''} ${p.session_type || ''}`;
      return matchesClass && matchesStatus && (!term || this.normalizeSearch(text).includes(term));
    });
  }
  /** Two timetable projections (class / teacher), both exclude cancelled sessions. */
  get timetableSessions(): Planning[] {
    const active = activeEdtSessions(this.visiblePlannings);
    return this.currentView === 'teacher'
      ? active.filter(p => String(p.teacher_id || '') === this.selectedTeacherForSchedule)
      : active;
  }
  get calendarRange(): {startHour: number; endHour: number} {
    return edtHourRange(this.timetableSessions, this.fullCalendarHours);
  }
  get calendarHours(): number[] {
    const {startHour,endHour}=this.calendarRange;
    return Array.from({length:endHour-startHour},(_,i)=>startHour+i);
  }
  get calendarHeight(): number { return this.calendarHours.length*140; }
  getTimetableForDay(day: Date): Planning[] {
    const key=format(day, 'yyyy-MM-dd');
    return this.timetableSessions.filter(plan => dayKey(plan.date)===key);
  }
  getCancellationReason(plan: Planning): string {
    return [...(plan.status_history || [])].reverse().find(change => change.to === 'Annulé')?.reason || '';
  }
  get activeDays(): Date[] {
    return this.daysOfWeek.filter(day => this.getPlanningsForDay(day).length > 0);
  }
  get awaitingCount(): number { return this.visiblePlannings.filter(p => p.status === 'À superviser').length; }
  get supervisedCount(): number { return this.visiblePlannings.filter(p => p.status === 'Supervisé').length; }
  get cancelledCount(): number { return this.visiblePlannings.filter(p => p.status === 'Annulé').length; }
  get teacherSchedule(): Planning[] {
    return sortedTeacherSchedule(this.visiblePlannings, this.selectedTeacherForSchedule) as Planning[];
  }
  get teacherScheduleName(): string {
    const t = this.teachers.find(t => t.id === this.selectedTeacherForSchedule);
    return t ? `${t.first_name} ${t.last_name}`.trim() : 'Enseignant';
  }
  get selectedModalTeacherName(): string {
    const t = this.teachers.find(t => t.id === this.modalData.teacher_id);
    return t ? `${t.first_name} ${t.last_name}`.trim() : '';
  }
  chooseFirstTeacherForSchedule(event: Event) {
    const first = this.filteredTeacherScheduleOptions[0];
    if (first && this.teacherViewOpen) { event.preventDefault(); this.selectTeacherForSchedule(first); }
  }
  chooseFirstModalTeacher(event: Event) {
    const first = this.filteredTeachers[0];
    if (first && this.modalTeacherOpen) { event.preventDefault(); this.selectModalTeacher(first); }
  }
  selectTeacherForSchedule(t: any) {
    this.selectedTeacherForSchedule = t.id;
    this.teacherViewQuery = `${t.first_name} ${t.last_name}`.trim();
    this.teacherViewOpen = false;
  }
  selectModalTeacher(t: any) {
    this.modalData.teacher_id = t.id;
    this.modalTeacherQuery = `${t.first_name} ${t.last_name}`.trim();
    this.modalTeacherOpen = false;
  }
  @HostListener('document:click', ['$event'])
  closeTeacherMenusOnOutsideClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest('.aura-teacher-view-picker')) this.teacherViewOpen = false;
    if (!target.closest('.aura-teacher-modal-picker')) this.modalTeacherOpen = false;
    if (!target.closest('.aura-ue-modal-picker')) this.modalUeOpen = false;
  }
  changeView(next: 'supervisor' | 'calendar' | 'teacher') {
    this.currentView = next;
    if (next === 'teacher' && !this.selectedTeacherForSchedule && this.teachers.length) {
      this.selectTeacherForSchedule(this.teachers[0]);
    }
    this.loadPlannings();
  }

  onModalClassChange() {
    const cls = this.databaseClasses.find(c => c.id === this.modalClassId);
    this.modalData.classe_id = cls?.id || null;
    if (cls?.name) this.modalData.parcours = cls.name;
    this.modalData.classe_name = cls?.name || this.modalData.parcours;
    this.modalData.parcours_id = cls?.parcours_id || null;
    // Ne pas modifier l'UE déjà choisie : aucune contrainte UE/classe n'existait auparavant.
  }

  // AURA V2.3: conversion explicite pour préserver les IDs Firestore et les noms historiques.
  onPlanningClassSelected(value: string | number | null): void {
    this.selectedParcours = String(value ?? '');
    this.onFilterChange();
  }
  onViewTeacherSelected(value: string | number | null): void {
    this.selectedTeacherForSchedule = String(value ?? '');
    this.teacherViewQuery = this.teacherScheduleName;
  }
  onModalClassSelected(value: string | number | null): void {
    this.modalClassId = String(value ?? '');
    if (!this.modalClassId) { this.modalData.parcours = ''; this.modalData.classe_name = ''; }
    this.onModalClassChange();
  }
  onModalUeSelected(value: string | number | null): void {
    this.modalData.ue_id = value ? String(value) : undefined;
  }
  onModalTeacherSelected(value: string | number | null): void {
    this.modalData.teacher_id = value ? String(value) : undefined;
  }

  // Modal State
  isAddModalOpen = false;
  isEditMode = false;
  isActivityMode = false; // New flag
  modalData: Partial<Planning> = this.getEmptyPlanning();

  daysOfWeek: Date[] = [];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private planningService: PlanningService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private toastService: ToastService,
    private parcoursService: ParcoursService,
    private notificationService: NotificationService,
    private activityService: ActivityService,
    private classeService: ClasseService,
    private supervisionService: SupervisionService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    // Deep links from operational dashboard are explicit, validated filters.
    const params = this.route.snapshot.queryParamMap;
    const status = params.get('status');
    if (status && ['À superviser','Supervisé','Annulé'].includes(status)) this.selectedStatus = status;
    const week = params.get('week');
    if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
      const parsed = parseISO(week);
      if (!isNaN(parsed.getTime())) {
        this.currentDate = parsed;
        this.weekStart = startOfWeek(parsed, {weekStartsOn:1});
        this.weekEnd = endOfWeek(parsed, {weekStartsOn:1});
      }
    }
    this.updateDaysOfWeek();
    this.loadUesAndTeachers();
    this.loadParcours();
    this.loadPlannings();
    if (params.get('add') === '1') this.openAddModal();
  }
  
  ngOnDestroy() {
      if (this.planningsSubscription) { this.planningsSubscription.unsubscribe(); }
      this.subscriptions.unsubscribe();
  }

  loadParcours() {
    this.subscriptions.add(
      this.parcoursService.getAll().subscribe({
        next: (data) => {
          this.parcoursList = data.map(p => p.name);
          this.cdr.detectChanges();
        },
        error: () => this.toastService.error('Erreur lors du chargement des parcours')
      })
    );
  }

  getEmptyPlanning(): Partial<Planning> {
    return {
      parcours: this.selectedParcours,
      session_type: 'CM',
      status: 'À superviser',
    };
  }

  loadUesAndTeachers() {
    this.subscriptions.add(
      this.ueService.getAll().subscribe({
        next: (data) => {
          this.ues = data;
          if (this.isAddModalOpen && this.modalData.ue_id && !this.ueSearch) {
            this.ueSearch = this.selectedModalUeLabel;
          }
          this.cdr.detectChanges();
        },
        error: () => this.toastService.error('Erreur de chargement des UEs'),
      })
    );
    this.subscriptions.add(
      this.teacherService.getAll().subscribe({
        next: (data) => { this.teachers = data; if (!this.selectedTeacherForSchedule && data.length) this.selectTeacherForSchedule(data[0]); this.cdr.detectChanges(); },
        error: () => this.toastService.error('Erreur de chargement des enseignants'),
      })
    );
    this.subscriptions.add(
      this.classeService.getAll().subscribe({
        next: (data) => { this.databaseClasses = data;  this.cdr.detectChanges(); },
        error: () => this.toastService.error('Erreur de chargement des classes'),
      })
    );
  }

  loadPlannings() {
    if (this.planningsSubscription) { 
        this.planningsSubscription.unsubscribe(); 
    }

    this.isScheduleLoading = true;
    this.scheduleError = '';
    const filters = {
      ...(this.currentView !== 'teacher' && this.selectedParcours ? {parcours: this.selectedParcours} : {}),
      startDate: format(this.weekStart, 'yyyy-MM-dd'),
      endDate: format(this.weekEnd, 'yyyy-MM-dd'),
      ...(this.currentView === 'supervisor' && this.selectedStatus ? { status: this.selectedStatus } : {}),
    };

    this.planningsSubscription = this.planningService.getPlannings(filters).subscribe({
      next: (data) => { this.plannings = data; this.isScheduleLoading = false; this.cdr.detectChanges(); },
      error: () => {this.isScheduleLoading = false; this.scheduleError = 'Erreur lors du chargement des plannings'; this.toastService.error(this.scheduleError); this.cdr.detectChanges();},
    });
  }

  getPlanningsForDay(day: Date): Planning[] {
    return this.visiblePlannings.filter((p) => p.date && isSameDay(parseDate(p.date), day));
  }

  formatDateHeader(date: Date): { dayName: string; dayDate: string } {
    return {
      dayName: format(date, 'EEEE', { locale: fr }),
      dayDate: format(date, 'dd MMM', { locale: fr }),
    };
  }

  formatMonthYear(day: Date): string { return format(day, 'MMMM yyyy', {locale: fr}); }

  getWeekLabel(): string {
    return `${format(this.weekStart, 'dd MMM', { locale: fr })} — ${format(this.weekEnd, 'dd MMM yyyy', { locale: fr })}`;
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

  todayWeek() {
    this.currentDate = new Date();
    this.weekStart = startOfWeek(this.currentDate, {weekStartsOn: 1});
    this.weekEnd = endOfWeek(this.currentDate, {weekStartsOn: 1});
    this.updateDaysOfWeek();
    this.loadPlannings();
  }
  resetFilters() {
    this.quickSearch = '';
    this.selectedParcours = '';
    this.selectedStatus = '';
    this.loadPlannings();
  }

  openAddModal() {
    this.isEditMode = false;
    this.isActivityMode = false;
    this.modalData = this.getEmptyPlanning();
    this.modalClassId = this.databaseClasses.find(c => c.name === this.selectedParcours)?.id || '';
    this.onModalClassChange();
    this.modalData.date = format(
      this.weekStart <= new Date() && this.weekEnd >= new Date() ? new Date() : this.weekStart,
      'yyyy-MM-dd',
    );
    this.changeReason = '';
    this.modalTeacherQuery = ''; this.modalTeacherOpen = false;
    this.ueSearch = ''; this.modalUeOpen = false; this.modalUeActiveIndex = 0;
    this.isAddModalOpen = true;
    this.focusPlanningDialog();
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
    this.modalTeacherQuery = ''; this.modalTeacherOpen = false;
    this.ueSearch = ''; this.modalUeOpen = false; this.modalUeActiveIndex = 0;
    this.isAddModalOpen = true;
    this.focusPlanningDialog();
  }

  openEditModal(planning: Planning) {
    this.isEditMode = true;
    this.modalData = { ...planning };
    this.modalClassId = planning.classe_id || this.databaseClasses.find(c => c.name === planning.parcours)?.id || '';
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
    this.changeReason = '';
    this.modalTeacherQuery = this.selectedModalTeacherName;
    this.modalTeacherOpen = false;
    this.ueSearch = this.selectedModalUeLabel;
    this.modalUeOpen = false; this.modalUeActiveIndex = 0;
    this.isAddModalOpen = true;
    this.focusPlanningDialog();
  }

  closeModal() {
    this.isAddModalOpen = false;
    this.modalUeOpen = false;
    this.modalTeacherOpen = false;
    this.modalTrigger?.focus();
    this.modalTrigger = null;
  }

  savePlanning() {
    // Validate either UE or Title provided
    if ((!this.modalData.ue_id && !this.modalData.title) || 
        !this.modalData.teacher_id || 
        !this.modalData.date || 
        !this.modalData.start_time || 
        !this.modalData.end_time ||
        !this.modalData.parcours) {
      this.toastService.error('Veuillez remplir tous les champs obligatoires (UE/Titre, Date, Heures).');
      return;
    }

    const error = validateSlot(this.modalData as Planning);
    if (error) {this.toastService.error(error); return;}
    if (this.isSavingPlanning) return;
    this.isSavingPlanning = true;
    if (this.isEditMode && this.modalData.id) {
      this.subscriptions.add(
      this.planningService.updatePlanning(this.modalData.id, {...this.modalData, change_reason:this.changeReason}).subscribe({
        next: () => {
          this.isSavingPlanning = false;
          this.toastService.success('Séance mise à jour');
          const ueName = this.modalData.title || 'Inconnue';
          this.activityService.logActivity('Mise à jour de séance', `Le planning de "${ueName}" a été mis à jour.`, 'Planning');
          this.notificationService.createNotification({
            title: 'Séance modifiée',
            message: `Vous avez mis à jour la séance "${ueName}".`,
            type: 'info',
            read: false
          });
          this.closeModal();
          this.loadPlannings();
        },
        error: (err) => {this.isSavingPlanning = false; this.toastService.error(err.message || 'Erreur de mise à jour');},
      })
      );
    } else {
      this.subscriptions.add(
      this.planningService.createPlanning(this.modalData as Planning).subscribe({
        next: () => {
          this.isSavingPlanning = false;
          this.toastService.success('Séance ajoutée au planning');
          const ueName = this.modalData.title || 'Inconnue';
          this.activityService.logActivity('Nouvelle séance planifiée', `Une séance "${ueName}" a été ajoutée.`, 'Planning');
          this.notificationService.createNotification({
            title: 'Nouvelle séance',
            message: `Vous avez planifié avec succès la séance "${ueName}".`,
            type: 'success',
            read: false
          });
          this.closeModal();
          this.loadPlannings();
        },
        error: (err) => {this.isSavingPlanning = false; this.toastService.error(err.message || 'Erreur de création');},
      })
      );
    }
  }

  private openActionDialog(dialog: NonNullable<Plannings['actionDialog']>): void {
    this.actionDialog = dialog;
    setTimeout(() => this.actionDialogRef?.nativeElement.focus(), 0);
  }

  deletePlanning(id: any): void {
    const planning = this.plannings.find(p => String(p.id) === String(id));
    if (!planning) { this.toastService.error('Séance introuvable'); return; }
    this.openActionDialog({kind:'delete',planning,reason:'',busy:false,error:''});
  }

  changeStatus(planning: Planning, event: Event): void {
    const element = event.target as HTMLSelectElement;
    const targetStatus = element.value as Planning['status'];
    element.value = planning.status || 'À superviser'; // Do not imply a write before confirmation.
    if (targetStatus === planning.status) return;
    this.openActionDialog({kind:'status',planning,targetStatus,reason:'',busy:false,error:''});
  }

  closeActionDialog(): void {
    if (this.actionDialog?.busy) return;
    this.actionDialog = null;
  }

  onActionBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeActionDialog();
  }

  confirmActionDialog(): void {
    const action = this.actionDialog;
    if (!action || action.busy || !action.planning.id) return;
    if (action.kind === 'status' && action.targetStatus === 'Annulé' && !action.reason.trim()) {
      action.error = 'Veuillez renseigner le motif de cette annulation.';
      return;
    }
    action.busy = true;
    action.error = '';
    const plan = action.planning;
    const title = plan.ue_name || plan.title || 'Séance';
    if (action.kind === 'delete') {
      this.subscriptions.add(this.planningService.deletePlanning(String(plan.id)).subscribe({
        next: () => {
          this.actionDialog = null;
          this.toastService.success('Séance supprimée');
          this.activityService.logActivity('Séance supprimée', `La séance "${title}" a été supprimée du planning.`, 'Planning');
          this.notificationService.createNotification({title:'Séance supprimée',message:`La séance "${title}" a été supprimée.`,type:'warning',read:false});
          this.loadPlannings();
        },
        error: (err) => {action.busy=false;action.error=err?.message || 'Erreur de suppression.';}
      }));
      return;
    }
    const status = action.targetStatus;
    if (!status) { action.busy=false; return; }
    const reason = action.reason.trim();
    this.subscriptions.add(this.planningService.updatePlanning(String(plan.id), {
      status,
      change_reason: status === 'Annulé' ? reason : (reason || '')
    }).subscribe({
      next: () => {
        this.actionDialog = null;
        this.toastService.success(status === 'Annulé' ? 'Séance annulée et conservée dans le suivi' : 'Statut mis à jour');
        this.activityService.logActivity('Statut de séance', `La séance "${title}" est passée à "${status}".`, 'Planning');
        this.loadPlannings();
      },
      error: (err) => {action.busy=false;action.error=err?.message || 'Échec du changement de statut.';}
    }));
  }

  async openSupervision(planning: Planning) {
    if (planning.status === 'Annulé') { this.toastService.error('Impossible de superviser une séance annulée.'); return; }
    if (!planning.id) return;
    if (planning.supervision_id) {this.router.navigate(['/admin/supervision-form'],{queryParams:{id:planning.supervision_id}}); return;}
    try {
      const linked = await firstValueFrom(this.supervisionService.getByPlanningId(planning.id));
      this.router.navigate(['/admin/supervision-form'], {queryParams:linked?.id ? {id:linked.id} : {planningId:planning.id}});
    } catch (e:any) {this.toastService.error(e.message || 'Impossible de charger la fiche.');}
  }

  // Exports and Print
  printSchedule() {
    window.print();
  }

  async exportPDF() {
    if (this.currentView === 'calendar' || this.currentView === 'teacher') {
      if (this.currentView === 'teacher' && !this.selectedTeacherForSchedule) {
        this.toastService.error('Sélectionnez un enseignant avant l’export.');
        return;
      }
      if (this.isScheduleLoading || this.scheduleError) {
        this.toastService.error('Le planning n’est pas encore disponible.');
        return;
      }
      try {
        exportWeeklyTimetablePdf({
          kind: this.currentView === 'teacher' ? 'teacher' : 'class',
          subject: this.currentView === 'teacher' ? this.teacherScheduleName : (this.selectedParcours || 'Toutes les classes'),
          start: this.weekStart,
          end: this.weekEnd,
          sessions: this.timetableSessions
        });
      } catch (err) {
        console.error('Erreur de génération de l’EDT', err);
        this.toastService.error('Impossible de générer cet emploi du temps.');
      }
      return;
    }
    // Preserve supervisor export semantics: this is an operational trace, not an EDT.
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Suivi des séances : ${this.selectedParcours || 'Toutes les classes'}`, 14, 20);
    doc.setFontSize(10); doc.text(this.getWeekLabel(), 14, 28);
    autoTable(doc, {
      startY: 34,
      head: [['Date','Horaires','UE / activité','Enseignant','Classe','Statut']],
      body: this.visiblePlannings.map(p => [p.date || '',`${p.start_time || ''} - ${p.end_time || ''}`,
        p.ue_name || p.title || '',`${p.teacher_first_name || ''} ${p.teacher_last_name || ''}`.trim(),
        p.classe_name || p.parcours || '',p.status || '']),
    });
    doc.save(`suivi-supervision-${format(this.weekStart,'yyyy-MM-dd')}.pdf`);
  }

  // Positioning logic for calendar blocks
  getTopPosition(startTime?: string, endTime?: string): string {
    if (!startTime && endTime) {
      const [hour,minute] = endTime.split(':').map(Number);
      const offset = Math.max(0, (hour+minute/60 - 1 - this.calendarRange.startHour)*140);
      return `${offset}px`;
    }
    if (!startTime) return '0px';
    const [h, m] = startTime.split(':').map(Number);
    
    // Both teacher and student calendars share a compact, data-derived time axis.
    const startHour = this.calendarRange.startHour;
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
    
    // Match actual durations; keep a minimum clickable area for short sessions.
    const height = Math.max(28, (endOffset - startOffset) * pixelsPerHour);

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
