import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <div *ngFor="let toast of toasts" 
           class="pointer-events-auto min-w-[300px] max-w-md p-4 rounded-xl shadow-lg border-l-4 transform transition-all duration-300 animate-slide-in"
           [ngClass]="{
             'bg-white border-green-500 text-slate-800 dark:bg-slate-800 dark:text-white': toast.type === 'success',
             'bg-white border-red-500 text-slate-800 dark:bg-slate-800 dark:text-white': toast.type === 'error',
             'bg-white border-blue-500 text-slate-800 dark:bg-slate-800 dark:text-white': toast.type === 'info',
             'bg-white border-yellow-500 text-slate-800 dark:bg-slate-800 dark:text-white': toast.type === 'warning'
           }">
        <div class="flex items-start gap-3">
          <div [ngClass]="{
            'text-green-500': toast.type === 'success',
            'text-red-500': toast.type === 'error',
            'text-blue-500': toast.type === 'info',
            'text-yellow-500': toast.type === 'warning'
          }">
            <span class="material-symbols-outlined text-2xl">
              {{ toast.type === 'success' ? 'check_circle' : (toast.type === 'error' ? 'error' : (toast.type === 'warning' ? 'warning' : 'info')) }}
            </span>
          </div>
          <div class="flex-1 pt-0.5">
            <h4 class="font-bold text-sm mb-0.5">{{ toast.title }}</h4>
            <p class="text-sm opacity-90">{{ toast.message }}</p>
          </div>
          <button (click)="remove(toast)" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .animate-slide-in {
      animation: slideIn 0.3s ease-out forwards;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private subscription: Subscription = new Subscription();
  private toastService = inject(ToastService);

  ngOnInit() {
    this.subscription = this.toastService.toasts$.subscribe(toasts => {
      this.toasts = toasts;
    });
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  remove(toast: Toast) {
    this.toastService.remove(toast.id);
  }
}
