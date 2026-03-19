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
  email = '';
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
        ? this.authService.login(this.email, this.password)
        : this.authService.register(this.email, this.password);

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
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
          this.errorMessage = 'Identifiants incorrects. Veuillez réessayer.';
        } else if (err.code === 'auth/email-already-in-use') {
          this.errorMessage = 'Cet email est déjà utilisé.';
        } else if (err.code === 'auth/invalid-email') {
          this.errorMessage = 'Format d\'email invalide.';
        } else {
          this.errorMessage = 'Une erreur est survenue (' + err.code + ').';
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


