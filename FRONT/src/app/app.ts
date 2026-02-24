import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingService } from './services/loading.service';
import { AutoLogoutService } from './services/auto-logout.service';
import { ToastComponent } from './shared/toast/toast.component';
import { delay } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isLoading = false;
  private router = inject(Router);
  private loadingService = inject(LoadingService);
  private autoLogoutService = inject(AutoLogoutService); // Initialize auto-logout monitoring

  ngOnInit() {
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
