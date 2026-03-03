import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConnectivityService {
  isOnline = signal(navigator.onLine);

  constructor() {
    window.addEventListener('online', () => this.updateOnlineStatus());
    window.addEventListener('offline', () => this.updateOnlineStatus());
  }

  private updateOnlineStatus() {
    this.isOnline.set(navigator.onLine);
  }
}
