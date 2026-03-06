import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisionService } from '../services/supervision.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ClasseService } from '../services/classe.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-supervision-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervision-form.html',
  styleUrl: './supervision-form.scss',
})
export class SupervisionForm implements AfterViewInit, OnInit, OnDestroy {
  @ViewChild('supervisorCanvas') supervisorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') teacherCanvas!: ElementRef<HTMLCanvasElement>;
  
  editingId: string | null = null;
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
  selectedTeacherId: number | null = null;

  formData = {
    teacherId: null as number | null,
    ueId: null as number | null,
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
    private ueService: UeService,
    private teacherService: TeacherService,
    private classeService: ClasseService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.scriptLoader();

    const user = this.authService.currentUserValue;
    if (user && user.username) {
        this.formData.supervisorName = user.username;
    }

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.editingId = params['id'];
        if (this.editingId) this.loadSupervision(this.editingId);
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  scriptLoader() {
    this.loadUEs();
    this.loadTeachers();
    this.loadClasses();
  }

  loadSupervision(id: string) {
    this.supervisionService.getById(id).subscribe({
      next: (data) => {
        if (!data) return;
        
        this.selectedTeacherId = (data.teacher && data.teacher.id) ? Number(data.teacher.id) : null; 
        
        this.formData = {
          teacherId: this.selectedTeacherId as any,
          ueId: (data.ue && data.ue.id) ? Number(data.ue.id) : null,
          teacherName: data.teacher?.name || '',
          module: data.ue?.name || '',
          
          level: data.session?.level || data.level || '',
          sessionNumber: data.session?.number || data.sessionNumber || 1,
          platform: data.session?.platform || data.platform || 'Zoom',
          presentCount: data.session?.students?.present ?? data.presentCount ?? 0,
          totalStudents: data.session?.students?.total ?? data.totalStudents ?? 0,
          
          date: data.visit_date || data.date || new Date().toISOString().split('T')[0],
          startTime: data.start_time || data.startTime || '',
          endTime: data.end_time || data.endTime || '',
          
          technical: data.evaluation?.technical || data.technical || { internet: '', audioVideo: '', punctuality: '' },
          pedagogical: data.evaluation?.pedagogical || data.pedagogical || { objectives: '', contentMastery: '', interaction: '', toolsUsage: '' },
          
          observations: data.observations || '',
          supervisorName: data.supervisor?.name || data.supervisorName || (this.authService.currentUserValue?.username || '')
        };

        if (this.selectedTeacherId) {
             this.onTeacherChange();
        }

        if (data.signatures) {
             if (data.signatures.supervisor) {
                 this.loadSignature('supervisor', data.signatures.supervisor);
             }
             if (data.signatures.teacher) {
                 this.loadSignature('teacher', data.signatures.teacher);
             }
        }
      },
      error: (e) => console.error(e)
    });
  }

  loadClasses() {
    this.classeService.getAll().subscribe({
      next: (data) => this.classesList = data,
      error: (err) => console.error('Error loading classes', err)
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
        next: (data) => {
            this.teachers = data.filter(t => t.status === 'active');
        },
        error: (err) => console.error('Error loading teachers', err)
    });
  }

  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement, 'supervisor');
    this.setupCanvas(this.teacherCanvas.nativeElement, 'teacher');
    if (!this.editingId) {
        this.loadSavedData();
    }
  }

  loadUEs() {
    this.ueService.getAll().subscribe({
      next: (data) => {
        this.ues = data;
      },
      error: (err) => console.error('Error loading UEs', err)
    });
  }

  onUEChange() {
    const selectedUE = this.ues.find(ue => ue.code === this.selectedUECode);
    if (selectedUE) {
      this.formData.ueId = selectedUE.id;
      this.formData.module = selectedUE.name || '';
    }
  }

  onClassChange() {
    const selectedClass = this.classesList.find(c => c.name === this.formData.level);
    if (selectedClass) {
      this.formData.totalStudents = selectedClass.effectif || 0;
      this.checkPresentCount();
    }
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
    this.showSaveModal = true;
  }

  confirmSave() {
    this.showSaveModal = false;
    this.isSaving = true;
    this.saveMessage = 'Sauvegarde...';
    
    const supervisorSig = this.supervisorCanvas.nativeElement?.toDataURL() || '';
    const teacherSig = this.teacherCanvas.nativeElement?.toDataURL() || '';

    const currentUser = this.authService.currentUserValue;

    const payload = {
        // Champs plats attendus par le backend MySQL
        date: this.formData.date,
        startTime: this.formData.startTime,
        endTime: this.formData.endTime,
        
        teacherName: this.formData.teacherName,
        teacherId: this.formData.teacherId,
        
        module: this.formData.module, // ue name
        ueId: this.formData.ueId,
        
        level: this.formData.level,
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
            this.handleSuccess();
        },
        error: (err) => {
           this.handleError(err);
        }
      });
    } else {
      this.supervisionService.create(payload).subscribe({
          next: (res) => {
              this.handleSuccess();
          },
          error: (err) => {
              this.handleError(err);
          }
      });
    }
  }

  handleSuccess() {
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
    window.location.reload();
  }
  
  closeErrorModal() {
    this.showErrorModal = false;
  }

  resetForm(askConfirmation: boolean = true) {
    if (askConfirmation && !confirm('Voulez-vous vraiment effacer tout le formulaire ?')) {
      return;
    }
    
    localStorage.removeItem('supervisionFormData');

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
