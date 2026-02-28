import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { Subscription, fromEvent, merge } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AutoLogoutService {
  // Durée d'inactivité avant déconnexion (15 minutes)
  private readonly TIMEOUT_MS = 15 * 60 * 1000; 
  private timer: any;
  private eventSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.init();
  }

  init() {
    this.startTracking();
    
    // Check if user is logged in on init
    this.authService.currentUser.subscribe(user => {
        if (user) {
            this.checkLastActivityAndInit();
            this.startTimer();
        } else {
            this.stopTimer();
        }
    });
  }

  // Vérifie si l'utilisateur était déjà inactif avant même de recharger la page
  // (ex: il a fermé l'onglet et revient 30min plus tard)
  private checkLastActivityAndInit() {
    const lastActiveStr = localStorage.getItem('lastActiveTime');
    if (this.authService.currentUserValue && lastActiveStr) {
      const lastActiveTime = parseInt(lastActiveStr, 10);
      const now = Date.now();
      
      if (now - lastActiveTime > this.TIMEOUT_MS) {
        console.log('Session expirée (inactivité précédente détectée)');
        this.logoutUser();
      }
    }
  }

  private startTracking() {
    // Run outside angular to avoid change detection on every mouse move
    this.ngZone.runOutsideAngular(() => {
        const events = [
            'click', 
            'mousemove', 
            'keydown', 
            'scroll', 
            'touchstart'
        ];
        
        // Listen to events directly for simplicity and to ensure we capture them
        events.forEach(event => {
            document.addEventListener(event, () => this.resetTimer(), true);
        });
    });
  }

  private startTimer() {
    this.stopTimer();
    // Update local storage so if they close the tab now, the time is fresh
    // But don't do it if we are just starting from an inactivity check that might fail?
    // Actually, startTimer implies valid session start or continuation.
    localStorage.setItem('lastActiveTime', Date.now().toString());

    this.ngZone.runOutsideAngular(() => {
        this.timer = setTimeout(() => {
            this.ngZone.run(() => this.logoutUser());
        }, this.TIMEOUT_MS);
    });
  }

  private stopTimer() {
    if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
    }
  }

  private resetTimer() {
    // Store last activity time for cross-session/tab-close persistence
    localStorage.setItem('lastActiveTime', Date.now().toString());

    // Only reset internal timer if one is running (user is logged in)
    // We throttle this logic slightly implicitly by how frequent events are, 
    // but updating localStorage is fast enough.
    if (this.timer) {
        this.stopTimer(); // Clear existing
        this.startTimer(); // Start new
    }
  }

  private logoutUser() {
    if (this.authService.currentUserValue) {
      console.log('Utilisateur inactif, déconnexion automatique.');
      this.authService.logout(this.router.url); // Pass current URL to redirect back after login
      this.toastService.info('Vous avez été déconnecté après 15 minutes d\'inactivité.', 'Session expirée');
    }
  }
}
