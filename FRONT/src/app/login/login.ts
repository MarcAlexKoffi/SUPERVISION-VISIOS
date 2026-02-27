import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
export class Login implements OnInit {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  isLoginMode = true;
  showPassword = false;
  returnUrl: string | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  ngOnInit() {
      // get return url from route parameters or default to '/'
      this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || null;

      // redirect to home if already logged in (optional UX choice)
      if (this.authService.currentUserValue) {
          // If returnUrl is present, go there, else check role
          if (this.returnUrl) {
             this.router.navigateByUrl(this.returnUrl);
          } else {
             // Let the regular flow decide based on role? Or just stay put?
             // Usually redirection is better
             const user = this.authService.currentUserValue;
             this.router.navigate(['/admin/dashboard']);
          }
      }
  }

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
        
        // Use returnUrl if available
        if (this.returnUrl) {
            this.router.navigateByUrl(this.returnUrl);
            return;
        }

        this.router.navigate(['/admin/dashboard']);


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


