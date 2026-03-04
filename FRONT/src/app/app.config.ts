import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection, isDevMode, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { jwtInterceptor } from './interceptors/jwt.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { notificationInterceptor } from './interceptors/notification.interceptor';
import { offlineInterceptor } from './interceptors/offline.interceptor';
import { provideServiceWorker } from '@angular/service-worker';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([
        jwtInterceptor, 
        loadingInterceptor,
        notificationInterceptor,
        offlineInterceptor
    ])), 
    provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode(),
            registrationStrategy: 'registerWhenStable:30000'
    }),
    // Firebase Providers
    provideFirebaseApp(() => initializeApp((environment as any).firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore())
  ]
};
