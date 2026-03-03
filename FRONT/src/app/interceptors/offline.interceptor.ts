import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, of, switchMap, tap, throwError } from 'rxjs';
import { ConnectivityService } from '../services/connectivity.service';
import { OfflineStorageService } from '../services/offline-storage.service';
import { ToastService } from '../services/toast.service';

export const offlineInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const connectivityService = inject(ConnectivityService);
  const offlineStorage = inject(OfflineStorageService);
  const toastService = inject(ToastService);

  return next(req).pipe(
    tap(event => {
      if (event instanceof HttpResponse && req.method === 'GET') {
        offlineStorage.cacheResponse(req.urlWithParams, event.body);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // Ignorer les requêtes de synchronisation pour éviter une boucle infinie
      if (req.headers.has('X-Is-Sync')) {
        return throwError(() => error);
      }

      // Si on est hors ligne ou erreur réseau (status 0)
      if (error.status === 0 || !connectivityService.isOnline()) {
        if (req.method === 'GET') {
          return from(offlineStorage.getCachedResponse(req.urlWithParams)).pipe(
            switchMap(cached => {
              if (cached) {
                 // Optionnel : notifier l'utilisateur
                 // toastService.showInfo('Données chargées hors ligne');
                 return of(new HttpResponse({ body: cached.body, status: 200 }));
              }
              return throwError(() => error);
            })
          );
        } else {
            // Mutation (POST, PUT, DELETE, PATCH)
            return from(offlineStorage.addToSyncQueue(req.urlWithParams, req.method, req.body)).pipe(
                switchMap(() => {
                    toastService.showSuccess('Action sauvegardée. Synchronisation automatique dès le retour de la connexion.');
                    // Retourner un succès simulé pour ne pas bloquer l'UI
                    return of(new HttpResponse({ status: 200, body: { message: 'Offline sync pending' } }));
                })
            );
        }
      }
      return throwError(() => error);
    })
  );
};
