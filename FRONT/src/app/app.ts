import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http'; // Import HttpClient
import { LoadingService } from './services/loading.service';
import { AutoLogoutService } from './services/auto-logout.service';
import { SyncService } from './services/sync.service';
import { ToastComponent } from './shared/toast/toast.component';
import { delay } from 'rxjs';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isLoading = false;
  private router = inject(Router);
  private http = inject(HttpClient); // Inject HttpClient
  private loadingService = inject(LoadingService);
  private autoLogoutService = inject(AutoLogoutService); // Initialize auto-logout monitoring
  private syncService = inject(SyncService);

  ngOnInit() {
    this.syncService.init();
    
    // WARM-UP: Réveiller le backend Render (Free Tier) dès le chargement de l'app
    const backendRoot = environment.apiUrl.replace('/api', '');
    this.http.get(backendRoot, { 
      responseType: 'text',
      headers: { 'X-Skip-Loading': 'true' } 
    }).subscribe({
      next: () => console.log('Backend is awake!'),
      error: (err) => console.log('Waking up backend...', err)
    });

    this.loadingService.loading$.pipe(delay(0)).subscribe((loading) => {
        this.isLoading = loading;
    });

    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.loadingService.show();
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        this.loadingService.hide();
      }
    });
  }
}
