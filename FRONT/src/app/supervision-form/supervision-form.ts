import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupervisionService } from '../services/supervision.service';
import { UeService } from '../services/ue.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-supervision-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supervision-form.html',
  styleUrl: './supervision-form.scss',
})
export class SupervisionForm implements AfterViewInit, OnInit {
  @ViewChild('supervisorCanvas') supervisorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') teacherCanvas!: ElementRef<HTMLCanvasElement>;
  
  currentDate = new Date();
  isSaving = false;
  saveMessage = 'Enregistrer la fiche';
  
  showSaveModal = false;
  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  ues: any[] = [];
  selectedUECode: string = '';

  formData = {
    teacherName: '',
    module: '',
    level: '',
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
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadUEs();
    
    // Auto-fill supervisor name if logged in
    const user = this.authService.currentUserValue;
    if (user && user.username) {
        this.formData.supervisorName = user.username;
    }
  }

  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement, 'supervisor');
    this.setupCanvas(this.teacherCanvas.nativeElement, 'teacher');
    this.loadSavedData();
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
      this.formData.module = selectedUE.name || '';
      // We fill the responsible as the default teacher, but allow editing
      this.formData.teacherName = selectedUE.responsible || '';
      this.formData.totalStudents = selectedUE.students_count ? parseInt(selectedUE.students_count) : 0;
      
      // Auto-fill Level/Semester/Phase
      const parts = [];
      if (selectedUE.level) parts.push(selectedUE.level);
      if (selectedUE.semester) parts.push(`S${selectedUE.semester}`);
      if (selectedUE.phase) parts.push(`Phase ${selectedUE.phase}`);
      this.formData.level = parts.join(' - ');
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

    this.supervisionService.create(payload).subscribe({
        next: (res) => {
            this.isSaving = false;
            this.showSuccessModal = true;
            this.saveMessage = 'Enregistrer la fiche';
            // Clear localStorage draft if any
            localStorage.removeItem('supervisionFormData');
            this.resetForm(false);
        },
        error: (err) => {
            console.error('Erreur sauvegarde', err);
            this.isSaving = false;
            this.saveMessage = 'Enregistrer la fiche';
            this.errorMessage = err.error?.message || err.statusText || 'Une erreur inconnue est survenue.';
            this.showErrorModal = true;
        }
    });
  }

  cancelSave() {
    this.showSaveModal = false;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
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
        teacherName: '',
        module: '',
        level: '',
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
