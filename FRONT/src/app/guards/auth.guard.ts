import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const currentUser = authService.currentUserValue;
  
  if (currentUser) {
      // User is logged in
      return true;
  }
  
  // User is not logged in, redirect to login page with the return url
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

