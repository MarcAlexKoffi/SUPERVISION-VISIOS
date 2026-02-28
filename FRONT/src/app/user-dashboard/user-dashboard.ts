import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupervisionService } from '../services/supervision.service';
import { ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent],
  templateUrl: './user-dashboard.html',
  styleUrl: './user-dashboard.scss',
})
export class UserDashboard implements OnInit {
    currentUser: any;
    mySupervisions: any[] = [];
    isLoading = true;
    showLogoutModal = false;

    constructor(
        private authService: AuthService, 
        private supervisionService: SupervisionService,
        private router: Router
    ) {
        this.currentUser = this.authService.currentUserValue?.user;
    }

    ngOnInit() {
        if (!this.currentUser) {
            this.authService.logout();
            return;
        }

        this.supervisionService.getAll().subscribe({
            next: (data) => {
                // Filter by current user ID
                this.mySupervisions = data
                    .filter(s => s.user_id === this.currentUser.id || s.supervisor_name === this.currentUser.username)
                    .map(s => ({
                        ...s,
                        date: new Date(s.visit_date), // Ensure date object
                        module: s.module,
                        teacherName: s.teacher_name
                    }));
                this.isLoading = false;
            },
            error: (err) => {
                console.error('Error fetching supervisions', err);
                this.isLoading = false;
            }
        });
    }

    get recentSupervisions() {
        return this.mySupervisions.slice(0, 5); // Show last 5
    }

    openLogoutModal() {
        this.showLogoutModal = true;
    }

    cancelLogout() {
        this.showLogoutModal = false;
    }

    confirmLogout() {
        this.authService.logout();
        this.showLogoutModal = false;
    }
}
