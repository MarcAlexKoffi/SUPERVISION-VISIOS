import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Ergonomic gate only; Firestore rules still enforce server-side authorisation. */
export const academicAdminGuard: CanActivateFn = () => {
  const user = inject(AuthService).currentUserValue;
  return user?.role === 'admin' ? true : inject(Router).createUrlTree(['/admin/dashboard']);
};
