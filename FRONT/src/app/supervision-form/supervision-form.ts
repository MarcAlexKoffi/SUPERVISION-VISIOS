import { Component, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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

  ngOnInit() {
    this.loadUEs();
  }

  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement, 'supervisor');
    this.setupCanvas(this.teacherCanvas.nativeElement, 'teacher');
    this.loadSavedData();
  }

  loadUEs() {
    const storedUEs = localStorage.getItem('ues');
    if (storedUEs) {
      try {
        this.ues = JSON.parse(storedUEs);
      } catch (e) {
        console.error('Error loading UEs', e);
      }
    }
  }

  onUEChange() {
    const selectedUE = this.ues.find(ue => ue.code === this.selectedUECode);
    if (selectedUE) {
      this.formData.module = selectedUE.name || '';
      this.formData.teacherName = selectedUE.responsible || '';
      // Assuming 'students' from UE is the total number of enrolled students
      this.formData.totalStudents = selectedUE.students ? parseInt(selectedUE.students) : 0;
      
      // Auto-fill Level information if available
      if (selectedUE.level) {
          const parts = [];
          if (selectedUE.level) parts.push(selectedUE.level);
          if (selectedUE.semester) parts.push(`S${selectedUE.semester}`);
          if (selectedUE.phase) parts.push(`Phase ${selectedUE.phase}`);
          this.formData.level = parts.join(' - ');
      }
    }
  }

  private loadSavedData() {
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

  private setupCanvas(canvas: HTMLCanvasElement, type: string) {
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
    
    // Convert canvases to base64 if needed
    const supervisorSig = this.supervisorCanvas.nativeElement?.toDataURL() || '';
    const teacherSig = this.teacherCanvas.nativeElement?.toDataURL() || '';
    
    const completeData = {
      ...this.formData,
      signatures: {
        supervisor: supervisorSig,
        teacher: teacherSig
      }
    };

    try {
      // 1. Save current draft (optional, or maybe clear it?) - keeping it for now or clearing it on success
      localStorage.setItem('supervisionFormData', JSON.stringify(completeData));
      
      // 2. Add to History
      const historyStr = localStorage.getItem('supervisionHistory');
      let history = historyStr ? JSON.parse(historyStr) : [];
      if (!Array.isArray(history)) history = [];
      
      // Add ID and timestamp
      const historyItem = {
        ...completeData,
        id: Date.now(),
        savedAt: new Date().toISOString()
      };
      
      history.unshift(historyItem); // Add to beginning
      localStorage.setItem('supervisionHistory', JSON.stringify(history));

      console.log('Data saved to localStorage history:', historyItem);
    } catch (e) {
      console.error('Error saving to localStorage', e);
    }

    // Simulate API call
    setTimeout(() => {
      this.isSaving = false;
      this.saveMessage = 'Enregistré !';
      this.showSuccessModal = true;
      this.resetForm(false);
      
      setTimeout(() => {
        this.saveMessage = 'Enregistrer la fiche';
      }, 2000);
    }, 1500);
  }

  cancelSave() {
    this.showSaveModal = false;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
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
      
      this.clearCanvas('supervisor');
      this.clearCanvas('teacher');
    // } (removed closing brace)
  }
}
