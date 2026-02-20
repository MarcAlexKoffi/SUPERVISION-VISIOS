import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  isLoginMode = true;
  showPassword = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  onSwitchMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMessage = '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit() {
    this.errorMessage = '';
    this.isLoading = true;

    const authObs = this.isLoginMode 
        ? this.authService.login(this.username, this.password)
        : this.authService.register(this.username, this.password);

    authObs.subscribe({
      next: (res) => {
        this.isLoading = false;
        console.log('Login response:', res);
        
        // POUR L'INSTANT : Redirection forcée vers le tableau de bord Admin pour tout le monde
        // (pour vous permettre de tester l'interface même avec un compte utilisateur)
        this.router.navigate(['/admin/dashboard']);

        /*
        // Code original pour la séparation des rôles (à réactiver plus tard)
        const role = res.user?.role || 'user';
        if (role === 'admin') {
            this.router.navigate(['/admin/dashboard']); 
        } else {
            this.router.navigate(['/user-dashboard']);
        }
        */
      },
      error: (err) => {
        this.isLoading = false;
        if (this.isLoginMode && err.status === 401) {
          this.errorMessage = 'Identifiants incorrects. Veuillez réessayer.';
        } else if (!this.isLoginMode && err.status === 409) {
          this.errorMessage = 'Ce nom d\'utilisateur est déjà pris.';
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
        }
        console.error(err);
      }
    });
  }

  // Garder l'ancienne méthode pour compatibilité si nécessaire, mais onSubmit est préférée
  login() {
    this.onSubmit();
  }
}


