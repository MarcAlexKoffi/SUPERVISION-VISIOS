import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap, catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';

export const notificationInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);

  // Skip notifications for GET requests to avoid spam, unless specific header is present?
  // For now, let's auto-notify on success only for mutation methods (POST, PUT, DELETE, PATCH)
  const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method);

  return next(req).pipe(
    tap((event) => {
      if (isMutation && event instanceof HttpResponse) {
        // You can customize the message based on the response body if needed
        // For example: const msg = event.body?.message || 'Opération réussie';
        
                // Simple default messages based on method
        let message = 'Opération effectuée avec succès';
        if (req.method === 'POST') message = 'Création réussie';
        if (req.method === 'PUT') message = 'Mise à jour réussie';
        if (req.method === 'DELETE') message = 'Suppression réussie';
        
        // If the backend returns a message property, use it
        if (event.body && (event.body as any).message) {
            message = (event.body as any).message;
        }

        toastService.success(message);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'Une erreur est survenue';
      
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        if (error.error && error.error.message) {
            errorMessage = error.error.message;
        } else if (error.status === 401) {
            errorMessage = 'Session expirée, veuillez vous reconnecter';
        } else if (error.status === 403) {
            errorMessage = 'Vous n\'avez pas les droits nécessaires';
        } else if (error.status === 404) {
            errorMessage = 'Ressource introuvable';
        } else if (error.status >= 500) {
            errorMessage = 'Erreur serveur interne';
        }
      }

      // Check if it's not a "loading" or "check" background call that we might want to ignore?
      // For now, show all errors.
      toastService.error(errorMessage);
      
      return throwError(() => error);
    })
  );
};
