import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-supervision-form',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './supervision-form.html',
  styleUrl: './supervision-form.scss',
})
export class SupervisionForm implements AfterViewInit {
  @ViewChild('supervisorCanvas') supervisorCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('teacherCanvas') teacherCanvas!: ElementRef<HTMLCanvasElement>;
  
  currentDate = new Date();
  
  ngAfterViewInit() {
    this.setupCanvas(this.supervisorCanvas.nativeElement);
    this.setupCanvas(this.teacherCanvas.nativeElement);
  }

  private setupCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000';
    };

    // Initial resize
    setTimeout(resize, 0); // Delay slightly to ensure layout is done
    window.addEventListener('resize', resize);

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      isDrawing = true;
      const pos = getPos(e);
      lastX = pos.x;
      lastY = pos.y;
      if (e.type === 'touchstart') e.preventDefault();
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      const pos = getPos(e);
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      
      lastX = pos.x;
      lastY = pos.y;
      if (e.type === 'touchmove') e.preventDefault();
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);
  }

  clearCanvas(type: 'supervisor' | 'teacher') {
    const canvas = type === 'supervisor' ? this.supervisorCanvas.nativeElement : this.teacherCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  printPage() {
    window.print();
  }

  saveForm() {
    // Here you would typically gather the form data and send it to a server
    // For now, we'll simulate a save with a visual feedback
    const originalText = document.querySelector('button[click*="saveForm"] span:last-child');
    if (originalText) {
        const btn = originalText.parentElement as HTMLButtonElement;
        const originalContent = btn.innerHTML;
        
        btn.innerHTML = `
            <span class="material-symbols-outlined animate-spin">sync</span>
            Sauvegarde...
        `;
        btn.disabled = true;
        
        setTimeout(() => {
            btn.innerHTML = `
                <span class="material-symbols-outlined">check_circle</span>
                Enregistré !
            `;
            btn.classList.add('bg-green-600', 'hover:bg-green-700');
            btn.classList.remove('from-primary', 'to-blue-600');
            
            setTimeout(() => {
                btn.innerHTML = originalContent;
                btn.disabled = false;
                btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                btn.classList.add('from-primary', 'to-blue-600');
            }, 2000);
        }, 1500);
    }
    console.log('Form data saving...');
  }

  resetForm() {
    if (confirm('Voulez-vous vraiment effacer tout le formulaire ?')) {
      // Clear inputs
      const inputs = document.querySelectorAll('input');
      inputs.forEach((input: HTMLInputElement) => {
        if (input.type === 'radio' || input.type === 'checkbox') input.checked = false;
        else input.value = '';
      });
      
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach((textarea: HTMLTextAreaElement) => textarea.value = '');
      
      const selects = document.querySelectorAll('select');
      selects.forEach((select: HTMLSelectElement) => select.selectedIndex = 0);
      
      // Clear canvases
      this.clearCanvas('supervisor');
      this.clearCanvas('teacher');
    }
  }
}
