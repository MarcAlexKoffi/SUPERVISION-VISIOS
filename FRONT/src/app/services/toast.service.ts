import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private _toasts = new BehaviorSubject<Toast[]>([]);
  public readonly toasts$ = this._toasts.asObservable();

  show(type: 'success' | 'error' | 'info' | 'warning', title: string, message: string, duration = 5000) {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = { id, type, title, message, duration };
    
    this._toasts.next([...this._toasts.value, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, duration);
    }
  }

  // Méthodes existantes
  success(message: string, title = 'Succès') {
    this.show('success', title, message);
  }

  error(message: string, title = 'Erreur') {
    this.show('error', title, message);
  }

  info(message: string, title = 'Information') {
    this.show('info', title, message);
  }

  // Méthodes alias pour compatibilité
  showSuccess(message: string, title = 'Succès') {
    this.show('success', title, message);
  }

  showError(message: string, title = 'Erreur') {
    this.show('error', title, message);
  }

  showInfo(message: string, title = 'Information') {
    this.show('info', title, message);
  }

  showWarning(message: string, title = 'Attention') {
    this.show('warning', title, message);
  }

  remove(id: string) {
    const currentToasts = this._toasts.value;
    this._toasts.next(currentToasts.filter(t => t.id !== id));
  }
}
