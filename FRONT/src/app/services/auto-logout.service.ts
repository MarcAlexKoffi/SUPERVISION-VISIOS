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
            this.startTimer();
        } else {
            this.stopTimer();
        }
    });
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
        
        const eventStreams = events.map(ev => fromEvent(document, ev));
        
        // Merge all event streams and throttle to avoid excessive resets
        this.eventSubscription = merge(...eventStreams)
            .pipe(throttleTime(1000)) 
            .subscribe(() => {
                this.ngZone.run(() => this.resetTimer());
            });
    });
  }

  private startTimer() {
    this.stopTimer();
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
    // Only reset if timer is running (user is logged in)
    if (this.timer) {
        this.startTimer();
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
