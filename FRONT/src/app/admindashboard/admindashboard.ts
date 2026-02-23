import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admindashboard.html',
  styleUrl: './admindashboard.scss',
})
export class Admindashboard {
  constructor(private authService: AuthService) {}

  get isAdmin(): boolean {
    const currentUser = this.authService.currentUserValue;
    return currentUser?.user?.role === 'admin' || currentUser?.role === 'admin';
  }
}
