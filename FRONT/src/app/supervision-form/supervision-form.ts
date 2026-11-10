import { AcademicSearchSelectComponent } from '../shared/components/academic-search-select/academic-search-select';
import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { AcademicUeSelectComponent } from '../shared/components/academic-ue-select/academic-ue-select';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { planningFingerprint } from '../services/planning-rules';
import { PlanningService, Planning } from '../services/planning.service';
import { numberedCourseSequence } from '../shared/utils/supervision-sequence';
import { combinedEnrollment } from '../shared/utils/supervision-class-attendance';
import { firstValueFrom, take } from 'rxjs';
import { SupervisionService } from '../services/supervision.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClasseService } from '../services/classe.service';
import { NotificationService } from '../services/notification.service';
import { Subscription } from 'rxjs';
import { ActivityService } from '../services/activity.service';

@Component({
  selector: 'app-supervision-form',
  standalone: true,
  imports: [AcademicSearchSelectComponent,AcademicUeSelectComponent, CommonModule, FormsModule],
  templateUrl: './supervision-form.html',
  styleUrl: './supervision-form.scss',
})
export class SupervisionForm implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('supervisorCanvas') supervisorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') teacherCanvas!: ElementRef<HTMLCanvasElement>;
  
  editingId: string | null = null;
  linkedPlanningId: string | null = null;
  private plannedFingerprint: string | null = null;
  private originalSupervision: any = null;
  private suppressSavedDraft = false;
  private planningSub: Subscription | null = null;
  prefillError = '';
  private routeSub: Subscription | null = null;

  currentDate = new Date();
  isSaving = false;
  saveMessage = 'Enregistrer la fiche';
  
  showSaveModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  ues: any[] = [];
  teachers: any[] = [];
  classesList: any[] = [];
  selectedUECode: string = '';
  selectedTeacherId: string | null = null;
  // Les tableaux multi-classes s'ajoutent aux champs historiques sans remplacer level.
  selectedClassIds: string[] = [];
  classQuery = '';
  classPickerOpen = false;
  linkedPrimaryClassId: string | null = null;
  linkedPrimaryClassName = '';
  sequenceError = '';
  get selectedClasses(): any[] {
    return this.classesList.filter(c => !!c.id && this.selectedClassIds.includes(String(c.id)));
  }
  get filteredFormClasses(): any[] {
    const q = this.classQuery.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    return this.classesList.filter(c => !q || String(c.name || '').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().includes(q)).slice(0, 35);
  }
  get classEffectifIncomplete(): boolean {
    return combinedEnrollment(this.classesList, this.selectedClassIds).missing.length > 0;
  }
  classSelectionChange(classe: any, checked: boolean): void {
    const id = String(classe.id || '');
    if (!id || (!checked && (this.linkedPrimaryClassId === id ||
      (!!this.linkedPrimaryClassName && classe.name === this.linkedPrimaryClassName)))) return;
    this.selectedClassIds = checked ? [...new Set([...this.selectedClassIds, id])] :
      this.selectedClassIds.filter(x => x !== id);
    if (!this.selectedClassIds.length && !this.linkedPrimaryClassId) { this.formData.level = ''; this.formData.totalStudents = 0; }
    this.onClassChange();
  }
  private restorePrimaryClassSelection(): void {
    if (this.selectedClassIds.length) return;
    const matches = this.classesList.filter(c => c.name === this.formData.level && !!c.id);
    if (matches.length === 1) this.selectedClassIds = [String(matches[0].id)];
  }
  private recalculateSelectedClasses(): void {
    this.restorePrimaryClassSelection();
    const selected = this.selectedClasses;
    if (!selected.length) return; // Ancien libellé absent du référentiel: ne pas inventer l'effectif.
    const primary = selected.find(c => c.id === this.linkedPrimaryClassId ||
      (!!this.linkedPrimaryClassName && c.name === this.linkedPrimaryClassName)) || selected[0];
    this.formData.level = primary.name;
    this.formData.totalStudents = combinedEnrollment(this.classesList, this.selectedClassIds).total;
    this.checkPresentCount();
  }


  formData = {
    teacherId: null as string | null,
    ueId: null as string | null,
    teacherName: '', 
    module: '',
    level: '',
    sessionNumber: 0,
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: '',
    platform: 'Zoom',
    presentCount: 0,
    totalStudents: 0,
    technical: {
      internet: '',
      audioVideo: '',
      punctuality: ''
    },
    pedagogical: {
      objectives: '',
      contentMastery: '',
      interaction: '',
      toolsUsage: ''
    },
    observations: '',
    supervisorName: ''
  };

  private contexts: { [key: string]: CanvasRenderingContext2D | null } = {};
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;

  constructor(
    private supervisionService: SupervisionService,
    private planningService: PlanningService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private classeService: ClasseService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private activityService: ActivityService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  onSyncTeacherSelected(value: string | number | null): void {
    this.selectedTeacherId = value ? String(value) : null;
    this.onTeacherChange();
  }
  onSyncClassSelected(value: string | number | null): void {
    this.formData.level = String(value ?? '');
    this.onClassChange();
  }

  ngOnInit() {
    this.scriptLoader();

    const user = this.authService.currentUserValue;
    if (user && user.username) {
        this.formData.supervisorName = user.username;
    }

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.suppressSavedDraft = true;
        this.editingId = params['id'];
        if (this.editingId) this.loadSupervision(this.editingId);
      } else if (params['planningId']) {
        this.suppressSavedDraft = true;
        this.prefillFromPlanning(String(params['planningId']));
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) this.routeSub.unsubscribe();
    if (this.planningSub) this.planningSub.unsubscribe();
  }

  scriptLoader() {
    this.loadUEs();
    this.loadTeachers();
    this.loadClasses();
  }

  loadSupervision(id: string) {
    this.supervisionService.getById(id).subscribe({
      next: data => {
        if (!data) {this.prefillError = 'Fiche introuvable.'; return;}
        this.originalSupervision = data;
        this.selectedClassIds = Array.isArray(data.classIds) ? data.classIds.map(String) :
          (Array.isArray(data.class_ids) ? data.class_ids.map(String) : []);

        this.linkedPlanningId = data.planning_id || null;
        this.linkedPrimaryClassName = this.linkedPlanningId ? (data.level || data.session?.level || '') : '';
        this.selectedTeacherId = String(data.teacherId || data.teacher_id || data.teacher?.id || '') || null;
        this.formData = {
          teacherId:this.selectedTeacherId,
          ueId:String(data.ueId || data.ue_id || data.ue?.id || '') || null,
          teacherName:data.teacherName || data.teacher?.name || '',
          module:data.module || data.ue?.name || '',
          level:data.level || data.session?.level || '',
          sessionNumber:data.sessionNumber || data.session?.number || 1,
          platform:data.platform || data.session?.platform || 'Zoom',
          presentCount:data.presentCount ?? data.session?.students?.present ?? 0,
          totalStudents:data.totalStudents ?? data.session?.students?.total ?? 0,
          date:data.date || data.visit_date || new Date().toISOString().split('T')[0],
          startTime:data.startTime || data.start_time || '',
          endTime:data.endTime || data.end_time || '',
          technical:data.technical || data.evaluation?.technical || {internet:'',audioVideo:'',punctuality:''},
          pedagogical:data.pedagogical || data.evaluation?.pedagogical || {objectives:'',contentMastery:'',interaction:'',toolsUsage:''},
          observations:data.observations || '',
          supervisorName:data.supervisorName || data.supervisor?.name || this.authService.currentUserValue?.username || ''
        };
        this.syncSelections();
        this.recalculateSelectedClasses();
        const supervisorSig = data.supervisorSignature || data.signatures?.supervisor;
        const teacherSig = data.teacherSignature || data.signatures?.teacher;
        if (supervisorSig) this.loadSignature('supervisor',supervisorSig);
        if (teacherSig) this.loadSignature('teacher',teacherSig);
        this.cdr.detectChanges();
      },
      error: () => this.prefillError = 'Erreur de chargement de la fiche de supervision.'
    });
  }

  prefillFromPlanning(id: string) {
    this.planningSub = this.planningService.getById(id).subscribe({
      next: (planning: Planning | null) => {
        if (!planning) {this.prefillError = 'Séance introuvable.'; return;}
        if (planning.status === 'Annulé') {this.prefillError = 'Cette séance est annulée.'; return;}
        if (planning.supervision_id) {
          this.router.navigate(['/admin/supervision-form'],{queryParams:{id:planning.supervision_id}});
          return;
        }
        this.linkedPlanningId = id;
        this.plannedFingerprint = planningFingerprint(planning);
        this.selectedTeacherId = planning.teacher_id || null;
        this.formData.teacherId = this.selectedTeacherId;
        this.formData.teacherName = `${planning.teacher_first_name || ''} ${planning.teacher_last_name || ''}`.trim();
        this.formData.ueId = planning.ue_id || null;
        this.formData.module = planning.ue_name || '';
        this.selectedUECode = planning.ue_code || '';
        if (planning.ue_id && planning.ue_code && !this.ues.some(u => u.id === planning.ue_id)) {
          this.ues = [...this.ues, {id:planning.ue_id,code:planning.ue_code,name:planning.ue_name || planning.ue_code}];
        }
        this.formData.level = planning.classe_name || planning.parcours;
        this.linkedPrimaryClassId = planning.classe_id || null;
        this.linkedPrimaryClassName = planning.classe_name || planning.parcours || '';
        this.selectedClassIds = planning.classe_id ? [String(planning.classe_id)] : [];
        this.formData.sessionNumber = 0;
        // Rang chronologique du cours pour la même UE, classe et enseignant.
        // Un enregistrement annulé ne consomme pas un numéro.
        void this.populateSessionNumber(planning);
        if (this.formData.level && !this.classesList.some(c => c.name === this.formData.level)) {
          this.classesList = [...this.classesList, {id:planning.classe_id,name:this.formData.level,effectif:0}];
        }
        this.formData.date = planning.date;
        this.formData.startTime = planning.start_time?.slice(0,5) || '';
        this.formData.endTime = planning.end_time?.slice(0,5) || '';
        const platform = planning.platform === 'Teams' ? 'Microsoft Teams' : planning.platform;
        if (platform) this.formData.platform = platform;
        this.syncSelections();
        this.onClassChange();
        this.cdr.detectChanges();
      },
      error: () => this.prefillError = 'Impossible de préremplir la séance.'
    });
  }

  private async populateSessionNumber(planning: Planning): Promise<void> {
    try {
      const all = await firstValueFrom(this.planningService.getPlannings().pipe(take(1)));
      if (this.linkedPlanningId !== planning.id || this.editingId) return;
      const number = numberedCourseSequence(all, planning);
      if (number !== null) this.formData.sessionNumber = number;
      else this.sequenceError = 'Numérotation indisponible : vérifiez l’UE, la classe et la programmation.';
      this.cdr.detectChanges();
    } catch {
      this.sequenceError = 'Impossible de calculer le numéro de séance depuis le Planning.';
      this.cdr.detectChanges();
    }
  }

  private syncSelections() {
    if (this.formData.ueId) {
      const ue = this.ues.find(u => u.id === this.formData.ueId);
      if (ue) {this.selectedUECode = ue.code; this.formData.module = ue.name;}
    } else if (!this.selectedUECode && this.formData.module) {
      const ue = this.ues.find(u => u.name === this.formData.module);
      if (ue) {this.selectedUECode = ue.code; this.formData.ueId = ue.id;}
    }
    if (this.selectedTeacherId) {
      const t = this.teachers.find(t => t.id === this.selectedTeacherId);
      if (t) this.formData.teacherName = `${t.first_name} ${t.last_name}`.trim();
    } else if (this.formData.teacherName) {
      const t = this.teachers.find(t => `${t.first_name} ${t.last_name}`.trim() === this.formData.teacherName);
      if (t) {this.selectedTeacherId = t.id; this.formData.teacherId = t.id;}
    }
  }

  loadClasses() {
    this.classeService.getAll().subscribe({
      next: (data) => {
        this.classesList = [...data, ...this.classesList.filter(c => c.name === this.formData.level && !data.some(d => d.name === c.name))];
        this.restorePrimaryClassSelection();
        this.recalculateSelectedClasses();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading classes', err)
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
        next: (data) => {
            this.teachers = data.filter(t => t.status === 'active' || t.id === this.selectedTeacherId);
            this.syncSelections();
            this.cdr.detectChanges();
        },
        error: (err) => console.error('Error loading teachers', err)
    });
  }

  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement, 'supervisor');
    this.setupCanvas(this.teacherCanvas.nativeElement, 'teacher');
    if (!this.suppressSavedDraft) this.loadSavedData();
  }

  loadUEs() {
    this.ueService.getAll().subscribe({
      next: (data) => {
        this.ues = [...data, ...this.ues.filter(u => u.id === this.formData.ueId && !data.some(d => d.id === u.id))];
        this.syncSelections();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error loading UEs', err)
    });
  }

  onUeCodeSelected(value: string | number | null): void {
    this.selectedUECode = String(value ?? '');
    if (!this.selectedUECode) { this.formData.ueId = null; this.formData.module = ''; }
    else this.onUEChange();
  }

  onUEChange() {
    const selectedUE = this.ues.find(ue => ue.code === this.selectedUECode);
    if (selectedUE) {
      this.formData.ueId = selectedUE.id;
      this.formData.module = selectedUE.name || '';
    }
  }

  onClassChange() {
    this.recalculateSelectedClasses();
  }

  checkPresentCount() {
    if (this.formData.presentCount > this.formData.totalStudents) {
      this.formData.presentCount = this.formData.totalStudents;
    } else if (this.formData.presentCount < 0) {
      this.formData.presentCount = 0;
    }
  }

  onTeacherChange() {
      const selectedTeacher = this.teachers.find(t => t.id == this.selectedTeacherId);
      if (selectedTeacher) {
          this.formData.teacherId = selectedTeacher.id;
          this.formData.teacherName = `${selectedTeacher.first_name} ${selectedTeacher.last_name}`;
      }
  }

  loadSavedData() {
    const saved = localStorage.getItem('supervisionFormData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this.formData = { ...this.formData, ...data };
        this.selectedClassIds = Array.isArray(data.classIds) ? data.classIds.map(String) : [];
        this.recalculateSelectedClasses();
        delete (this.formData as any).signatures;

        if (data.signatures) {
          this.loadSignature('supervisor', data.signatures.supervisor);
          this.loadSignature('teacher', data.signatures.teacher);
        }
      } catch (e) {
        console.error('Error loading data from localStorage', e);
      }
    }
  }

  private loadSignature(type: 'supervisor' | 'teacher', dataUrl: string) {
    if (!dataUrl) return;
    const canvas = type === 'supervisor' ? this.supervisorCanvas.nativeElement : this.teacherCanvas.nativeElement;
    const ctx = this.contexts[type];
    const img = new Image();
    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  }

  setupCanvas(canvas: HTMLCanvasElement, type: string) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    this.contexts[type] = ctx;
    
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
    };
    
    setTimeout(resize, 0);
    window.addEventListener('resize', resize);
    
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      this.isDrawing = true;
      const pos = this.getPos(e, canvas);
      this.lastX = pos.x;
      this.lastY = pos.y;
      
      if (e.type === 'touchstart') {
          e.preventDefault(); 
      }
    };
    
    const draw = (e: MouseEvent | TouchEvent) => {
      if (!this.isDrawing) return;
      const pos = this.getPos(e, canvas);
      
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      this.lastX = pos.x;
      this.lastY = pos.y;
      
      if (e.type === 'touchmove') {
          e.preventDefault();
      }
    };
    
    const stopDrawing = () => {
      this.isDrawing = false;
      ctx.beginPath();
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
  }
  
  private getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? (e as TouchEvent).touches[0].clientY : (e as MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  clearCanvas(type: 'supervisor' | 'teacher') {
    const canvas = type === 'supervisor' ? this.supervisorCanvas.nativeElement : this.teacherCanvas.nativeElement;
    const ctx = this.contexts[type];
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  handleImageImport(event: any, type: 'supervisor' | 'teacher') {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const img = new Image();
        img.onload = () => {
          const canvas = type === 'supervisor' ? this.supervisorCanvas.nativeElement : this.teacherCanvas.nativeElement;
          const ctx = this.contexts[type] || canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            const x = (canvas.width - w) / 2;
            const y = (canvas.height - h) / 2;
            ctx.drawImage(img, x, y, w, h);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  }

  printPage() {
    window.print();
  }

  saveForm() {
      // Custom validation for required fields
      if (!this.selectedUECode || !this.selectedTeacherId || !this.formData.level || !this.formData.date || !this.formData.startTime || !this.formData.endTime || !this.formData.sessionNumber || !this.formData.platform) {
          alert('Veuillez remplir tous les champs obligatoires (marqués d\'un *).');
          return;
      }
      this.showSaveModal = true;
  }

  confirmSave() {
    this.showSaveModal = false;
    this.isSaving = true;
    this.saveMessage = 'Sauvegarde...';
    
    const supervisorSig = this.supervisorCanvas.nativeElement?.toDataURL() || '';
    const teacherSig = this.teacherCanvas.nativeElement?.toDataURL() || '';

    const currentUser = this.authService.currentUserValue;

    // Preserve additional historical fields when editing an existing record.
    const {id: _oldId, ...previousData} = this.originalSupervision || {};
    const payload = {
        ...previousData,
        ...(this.linkedPlanningId ? { planning_id:this.linkedPlanningId } : {}),
        ...(this.linkedPlanningId && !this.editingId ? {planning_slot_fingerprint:this.plannedFingerprint} : {}),
        // Champs plats attendus par le backend MySQL
        date: this.formData.date,
        startTime: this.formData.startTime,
        endTime: this.formData.endTime,
        
        teacherName: this.formData.teacherName,
        teacherId: this.formData.teacherId,
        
        module: this.formData.module, // ue name
        ueId: this.formData.ueId,
        
        level: this.formData.level, // classe principale maintenue pour compatibilité
        classIds: this.selectedClasses.map(c => String(c.id)),
        classNames: this.selectedClasses.map(c => String(c.name)),
        sessionNumber: this.formData.sessionNumber,
        platform: this.formData.platform,
        
        presentCount: this.formData.presentCount,
        totalStudents: this.formData.totalStudents,
        
        supervisorName: this.formData.supervisorName,
        
        // Objets imbriqués (le backend les gère aussi si destructuré correctement, 
        // ou on peut aplatir si nécessaire, mais le controller semble attendre technical/pedagogical objets)
        technical: this.formData.technical,
        pedagogical: this.formData.pedagogical,
        
        observations: this.formData.observations,
        
        supervisorSignature: supervisorSig,
        teacherSignature: teacherSig,

        // On garde la structure nested pour compatibilité legacy si besoin, ou on l'enlève.
        // Pour l'instant, le backend MySQL ne regarde que les champs plats ci-dessus.
        updated_at: new Date()
    };
    
    if (!this.editingId) {
        (payload as any).created_at = new Date();
    }

    if (this.editingId) {
      this.supervisionService.update(this.editingId, payload).subscribe({
        next: (res) => {
            this.handleSuccess(!!this.editingId);
        },
        error: (err) => {
           this.handleError(err);
        }
      });
    } else {
      this.supervisionService.create(payload).subscribe({
          next: (res) => {
              this.handleSuccess(!!this.editingId);
          },
          error: (err) => {
              this.handleError(err);
          }
      });
    }
  }

  handleSuccess(isEdit: boolean = false) {
      const currentUser = this.authService.currentUserValue;
      
      // Enregistrer l'activité
      const actionTitle = isEdit ? 'Mise à jour de supervision' : 'Nouvelle supervision';
      const actionDetails = `Le rapport de supervision pour "${this.formData.module || 'UE Inconnue'}" a été ${isEdit ? 'mis à jour' : 'soumis'}.`;
      this.activityService.logActivity(actionTitle, actionDetails, 'Supervision');

      // Notifier l'utilisateur lui-même "quelque soit mon rôle"
      this.notificationService.createNotification({
          user_id: currentUser?.uid || currentUser?.id,
          type: 'success',
          title: actionTitle,
          message: actionDetails,
          read: false,
          link: '/admin/history'
      }).catch(console.error);

      if (!isEdit && currentUser?.role !== 'admin') {
          // Notify admins of new supervision by user
          this.notificationService.createNotification({
              role: 'admin',
              type: 'success',
              title: 'Nouvelle Supervision',
              message: `${currentUser?.username || 'Un utilisateur'} a soumis un rapport (${this.formData.module}).`,
              read: false,
              link: '/admin/history'
          }).catch(console.error);
      }

      this.isSaving = false;
      this.showSuccessModal = true;
      this.saveMessage = 'Enregistrer la fiche';
      localStorage.removeItem('supervisionFormData');
  }

  handleError(err: any) {
      console.error('Erreur sauvegarde', err);
      this.isSaving = false;
      this.saveMessage = 'Enregistrer la fiche';
      this.errorMessage = err.error?.message || err.statusText || 'Une erreur inconnue est survenue.';
      this.showErrorModal = true;
  }

  cancelSave() {
    this.showSaveModal = false;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
    if (this.linkedPlanningId) this.router.navigate(['/admin/plannings']);
    else window.location.reload();
  }
  
  closeErrorModal() {
    this.showErrorModal = false;
  }

  resetForm(askConfirmation: boolean = true) {
    if (askConfirmation && !confirm('Voulez-vous vraiment effacer tout le formulaire ?')) {
      return;
    }
    
    localStorage.removeItem('supervisionFormData');

    this.selectedClassIds = [];
    this.linkedPrimaryClassId = null;
    this.linkedPrimaryClassName = '';
    this.classPickerOpen = false;
    this.formData = {
        teacherId: null,
        ueId: null,
        teacherName: '',
        module: '',
        level: '',
        sessionNumber: 0,
        date: new Date().toISOString().split('T')[0],
        startTime: '',
        endTime: '',
        platform: 'Zoom',
        presentCount: 0,
        totalStudents: 0,
        technical: {
          internet: '',
          audioVideo: '',
          punctuality: ''
        },
        pedagogical: {
          objectives: '',
          contentMastery: '',
          interaction: '',
          toolsUsage: ''
        },
        observations: '',
        supervisorName: ''
      };

      const user = this.authService.currentUserValue;
      if (user && user.username) {
          this.formData.supervisorName = user.username;
      }
      
      this.clearCanvas('supervisor');
      this.clearCanvas('teacher');
  }
}
