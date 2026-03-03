import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { OfflineStorageService } from './offline-storage.service';
import { ToastService } from './toast.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private http = inject(HttpClient);
  private offlineStorage = inject(OfflineStorageService);
  private toastService = inject(ToastService);

  constructor() {
    window.addEventListener('online', () => {
      this.processQueue();
    });
  }

  async processQueue() {
    if (!navigator.onLine) return;

    const queue = await this.offlineStorage.getSyncQueue();
    if (queue.length === 0) return;

    this.toastService.showInfo('Connexion rétablie. Synchronisation des données en cours...');

    let errorCount = 0;

    for (const item of queue) {
      try {
        // Replay request with header to avoid re-queueing
        await firstValueFrom(this.http.request(item.method, item.url, { 
            body: item.body,
            headers: { 'X-Is-Sync': 'true' }
        }));
        
        // Remove from queue if successful
        await this.offlineStorage.removeFromQueue(item.timestamp);
        
      } catch (error) {
        console.error('Sync failed for item', item, error);
        errorCount++;
      }
    }

    if (errorCount === 0) {
      this.toastService.showSuccess('Toutes les données hors ligne ont été synchronisées !');
    } else {
      this.toastService.showWarning(`${errorCount} élément(s) n'ont pas pu être synchronisés. Nouvelle tentative ultérieurement.`);
    }
  }

  // Initialisation explicite si besoin
  init() {
    // Vérifier s'il y a des éléments en attente au démarrage
    if (navigator.onLine) {
        this.processQueue();
    }
  }
}
