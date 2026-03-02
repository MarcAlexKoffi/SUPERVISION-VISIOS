import { Component, ElementRef, ViewChild, AfterViewInit, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisionService } from '../services/supervision.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service'; // Import TeacherService
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
  
  editingId: number | null = null;
  private routeSub: Subscription | null = null;

  currentDate = new Date();
  isSaving = false;
  saveMessage = 'Enregistrer la fiche';
  
  showSaveModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  ues: any[] = [];
  teachers: any[] = []; // List of teachers
  classesList: any[] = []; // List of classes
  selectedUECode: string = '';
  selectedTeacherId: number | null = null; // Store selected teacher ID

  formData = {
    teacherId: null, // New field for ID
    ueId: null,      // New field for ID
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
    private teacherService: TeacherService, // Inject TeacherService
    private classeService: ClasseService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.scriptLoader();

    // Auto-fill supervisor name if logged in (only if not editing, handled later)
    const user = this.authService.currentUserValue;
    if (user && user.username) {
        this.formData.supervisorName = user.username;
    }

    this.routeSub = this.route.queryParams.subscribe(params => {
      if (params['id']) {
        this.editingId = +params['id'];
        this.loadSupervision(this.editingId);
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
    this.loadTeachers(); // Load teachers
    this.loadClasses();
  }

  loadSupervision(id: number) {
    this.supervisionService.getById(id).subscribe({
      next: (data) => {
        if (!data) return;
        
        // Map backend data to formData
        // Adjust field mapping as necessary based on your backend response structure
        this.selectedTeacherId = (data.teacher && data.teacher.id) ? data.teacher.id : data.teacherId; 
        
        // Ensure formData matches the structure
        this.formData = {
          teacherId: data.teacherId || (data.teacher ? data.teacher.id : null),
          ueId: data.ueId || (data.course ? data.course.id : null),
          teacherName: data.teacherName || (data.teacher ? data.teacher.name : ''),
          module: data.module || (data.course ? data.course.name : ''),
          level: data.level || (data.course ? data.course.level : ''), // Or from backend directly
          sessionNumber: data.sessionNumber || 1,
          date: data.date ? data.date.split('T')[0] : new Date().toISOString().split('T')[0],
          startTime: data.startTime || data.startTimeStr,
          endTime: data.endTime || data.endTimeStr,
          platform: data.platform,
          presentCount: data.presentCount || 0,
          totalStudents: data.totalStudents || 0,
          technical: data.technical || { internet: '', audioVideo: '', punctuality: '' },
          pedagogical: data.pedagogical || { objectives: '', contentMastery: '', interaction: '', toolsUsage: '' },
          observations: data.observations || '',
          supervisorName: data.supervisorName || (this.authService.currentUserValue?.username || '')
        };

        // Trigger change detection for selects if needed
        if (this.selectedTeacherId) {
             // force update
             this.onTeacherChange();
        }

        // Load signatures if they exist (assuming stored as base64 or URL in backend)
        // If they are not in the main object, adjust accordingly.
        // Assuming backend might not return full base64 for performance unless requested, 
        // OR it returns them. Let's assume they are in data.supervisorSignature and data.teacherSignature
        if (data.supervisorSignature) {
            setTimeout(() => this.loadSignature('supervisor', data.supervisorSignature), 100);
        }
        if (data.teacherSignature) {
            setTimeout(() => this.loadSignature('teacher', data.teacherSignature), 100);
        }

      },
      error: (err) => {
        console.error('Error loading supervision', err);
        // this.router.navigate(['/admin/history']);
      }
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
    // Only load from localStorage if not editing an existing supervision
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
      // We no longer set level or totalStudents from UE, it comes from the Classe selection
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
        // Restore form fields
        this.formData = { ...this.formData, ...data };
        // Remove signatures from formData if they were merged in (cleanup)
        delete (this.formData as any).signatures;

        // Restore signatures to canvas
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
    
    // Set canvas size to match display size
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      // Set actual size in memory (scaled to account for extra pixel density if needed)
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
    };
    
    // Initial resize
    setTimeout(resize, 0);
    window.addEventListener('resize', resize);
    
    // Drawing event handlers
    const startDrawing = (e: MouseEvent | TouchEvent) => {
      this.isDrawing = true;
      const pos = this.getPos(e, canvas);
      this.lastX = pos.x;
      this.lastY = pos.y;
      
      // Prevent scrolling on touch devices
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
      ctx.beginPath(); // Reset path to prevent connectinglines
    };

    // Mouse Events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Touch Events
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
  }
  
  private getPos(e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
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
            // Clear current canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Calculate scale to fit image within canvas while maintaining aspect ratio
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
      // Reset input value to allow selecting same file again
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
    
    // Convert canvases to base64
    const supervisorSig = this.supervisorCanvas.nativeElement?.toDataURL() || '';
    const teacherSig = this.teacherCanvas.nativeElement?.toDataURL() || '';

    const payload = {
        ...this.formData,
        supervisorSignature: supervisorSig,
        teacherSignature: teacherSig
    };

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
      // Clear localStorage draft if any
      localStorage.removeItem('supervisionFormData');
      // this.resetForm(false); // Don't reset immediately, let user click OK
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
    
    // Clear draft from storage
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

      // Restore supervisor name
      const user = this.authService.currentUserValue;
      if (user && user.username) {
          this.formData.supervisorName = user.username;
      }
      
      this.clearCanvas('supervisor');
      this.clearCanvas('teacher');
  }
}
