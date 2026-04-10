import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AsyncSupervisionService } from '../services/async-supervision.service';
import { UeService } from '../services/ue.service';
import { TeacherService } from '../services/teacher.service';
import { ClasseService } from '../services/classe.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-async-supervision-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './async-supervision-form.html',
  styleUrl: './async-supervision-form.scss',
})
export class AsyncSupervisionForm implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('supervisorCanvas') supervisorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') teacherCanvas!: ElementRef<HTMLCanvasElement>;

  private contexts: { [key: string]: CanvasRenderingContext2D } = {};
  private isDrawing = false;

  classesList: any[] = [];
  
  isSaving = false;
  
  showSuccessModal = false;
  showErrorModal = false;
  errorMessage = '';

  ues: any[] = [];
  teachers: any[] = [];
  
  startDate: string = '';
  endDate: string = '';

  formData = {
    teacherId: null as string | number | null,
    ueId: null as string | number | null,
    week: '',
    status: '', // Réalisé, Partiellement réalisé, Non réalisé
    observations: '',
    classe: '',
    effectif: 0,
    supervisorName: '',
    supervisorSignature: '',
    teacherSignature: ''
  };

  statusOptions = [
    { label: 'Réalisé', value: 'Réalisé', textClass: 'text-green-600', bgClass: 'bg-green-100', dotClass: 'bg-green-500' },
    { label: 'Partiellement réalisé', value: 'Partiellement réalisé', textClass: 'text-yellow-600', bgClass: 'bg-yellow-100', dotClass: 'bg-yellow-500' },
    { label: 'Non réalisé', value: 'Non réalisé', textClass: 'text-red-600', bgClass: 'bg-red-100', dotClass: 'bg-red-500' }
  ];

  constructor(
    private asyncSupervisionService: AsyncSupervisionService,
    private ueService: UeService,
    private teacherService: TeacherService,
    private classeService: ClasseService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadUEs();
    this.loadTeachers();
    this.loadClasses();
    this.setDefaultWeek();
    const user = this.authService.currentUserValue;
    if (user && (user.username || user.firstName)) {
      this.formData.supervisorName = user.username || (user.firstName + ' ' + user.lastName);
    }
  }

  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement, 'supervisor');
    this.setupCanvas(this.teacherCanvas.nativeElement, 'teacher');
  }

  loadClasses() {
    this.classeService.getAll().subscribe({
      next: (data) => this.classesList = data,
      error: (e) => console.error('Error loading classes', e)
    });
  }

  ngOnDestroy() {
    
  }

  setDefaultWeek() {
    // Keep it empty or set some default string dates like 'YYYY-MM-DD' if desired
  }

  updateWeekString() {
    if (this.startDate && this.endDate) {
      const startParts = this.startDate.split('-');
      const endParts = this.endDate.split('-');
      const startFormatted = startParts[2] + '/' + startParts[1] + '/' + startParts[0];
      const endFormatted = endParts[2] + '/' + endParts[1] + '/' + endParts[0];
      this.formData.week = this.formData.week = 'Semaine du ' + startFormatted + ' au ' + endFormatted;
    } else {
      this.formData.week = '';
    }
  }

  loadUEs() {
    this.ueService.getAll().subscribe({
      next: (data: any[]) => {
        this.ues = data;
      },
      error: (err: any) => {
        console.error('Erreur chargement UEs', err);
      }
    });
  }

  loadTeachers() {
    this.teacherService.getAll().subscribe({
      next: (data: any[]) => {
        this.teachers = data;
      },
      error: (err: any) => {
        console.error('Erreur chargement Enseignants', err);
      }
    });
  }

  onClassChange() {
    const selectedClass = this.classesList.find(c => c.name === this.formData.classe);
    if (selectedClass && selectedClass.effectif) {
      this.formData.effectif = selectedClass.effectif;
    }
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

    resize();
    window.addEventListener('resize', resize);
  }

  startDrawing(e: MouseEvent | TouchEvent, type: string) {
    e.preventDefault();
    this.isDrawing = true;
    const ctx = this.contexts[type];
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  }

  draw(e: MouseEvent | TouchEvent, type: string) {
    if (!this.isDrawing) return;
    e.preventDefault();
    
    const ctx = this.contexts[type];
    const canvas = e.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  clearSignature(type: string) {
    const canvas = type === 'supervisor' ? this.supervisorCanvas.nativeElement : this.teacherCanvas.nativeElement;
    const ctx = this.contexts[type];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    }
  }

  onSubmit() {
    if (!this.formData.teacherId || !this.formData.ueId || !this.formData.week || !this.formData.status) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (Enseignant, UE, Semaine, Statut).';
      this.showErrorModal = true;
      return;
    }

    this.isSaving = true;

    // Get signatures data URLs
    const supervisorSig = this.supervisorCanvas.nativeElement.toDataURL();
    const teacherSig = this.teacherCanvas.nativeElement.toDataURL();

    // Check if empty canvas
    const isCanvasEmpty = (canvas: HTMLCanvasElement) => {
      const blank = document.createElement('canvas');
      blank.width = canvas.width;
      blank.height = canvas.height;
      return canvas.toDataURL() === blank.toDataURL();
    };

    if (!isCanvasEmpty(this.supervisorCanvas.nativeElement)) {
      this.formData.supervisorSignature = supervisorSig;
    }
    if (!isCanvasEmpty(this.teacherCanvas.nativeElement)) {
      this.formData.teacherSignature = teacherSig;
    }

    this.asyncSupervisionService.create(this.formData).subscribe({
      next: () => {
        this.isSaving = false;
        this.showSuccessModal = true;
      },
      error: (err) => {
        console.error('Erreur save', err);
        this.isSaving = false;
        this.errorMessage = 'Erreur lors de l\'enregistrement. Réessayez.';
        this.showErrorModal = true;
      }
    });
  }

  resetForm() {
    const user = this.authService.currentUserValue;
    this.formData = {
      teacherId: null,
      ueId: null,
      week: '',
      status: '',
      observations: '',
      classe: '',
      effectif: 0,
      supervisorName: user ? (user.username || (user.firstName + ' ' + user.lastName)) : '',
      supervisorSignature: '',
      teacherSignature: ''
    };
    this.clearSignature('supervisor');
    this.clearSignature('teacher');
    this.setDefaultWeek();
  }

  goBack() {
    this.router.navigate(['/']);
  }
}


