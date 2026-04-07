import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService, Notification } from '../services/notification.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, ConfirmationModalComponent],
  templateUrl: './admindashboard.html',
  styleUrl: './admindashboard.scss',
})
export class Admindashboard implements OnInit, OnDestroy {
  showLogoutModal = false;
  isSidebarOpen = false;
  
  // Notifications state
  notifications: Notification[] = [];
  unreadCount = 0;
  showNotifications = false;
  private notifSub?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.notifSub = this.notificationService.getUserNotifications().subscribe(notifs => {
      this.notifications = notifs;
      this.unreadCount = notifs.filter(n => !n.read).length;
    });
  }

  ngOnDestroy() {
    if (this.notifSub) this.notifSub.unsubscribe();
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  toggleNotifications(event: Event) {
    event.stopPropagation();
    this.showNotifications = !this.showNotifications;
  }
  
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    // Close notifications dropdown when clicking outside
    this.showNotifications = false;
  }

  handleNotificationClick(notif: Notification, event: Event) {
    event.stopPropagation();
    if (!notif.read && notif.id) {
      this.notificationService.markAsRead(notif.id);
    }
    
    if (notif.link) {
      this.router.navigate([notif.link]);
      this.showNotifications = false;
    }
  }
  
  markAllNotificationsAsRead(event: Event) {
    event.stopPropagation();
    if (this.user?.uid) {
      this.notificationService.markAllAsReadForUser(this.user.uid, this.notifications);
    }
  }

  get user(): any {
    return this.authService.currentUserValue;
  }

  get isAdmin(): boolean {
    const user = this.user;
    return user?.role === 'admin';
  }

  openLogoutModal() {
    console.log('Opening logout modal');
    this.showLogoutModal = true;
  }

  cancelLogout() {
    this.showLogoutModal = false;
  }

  confirmLogout() {
    console.log('Logging out...');
    this.authService.logout();
    this.showLogoutModal = false;
  }
}
