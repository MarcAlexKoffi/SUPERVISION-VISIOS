import { Injectable } from '@angular/core';
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface SupervisionDB extends DBSchema {
  'api-cache': {
    key: string;
    value: {
      url: string;
      body: any;
      timestamp: number;
    };
  };
  'sync-queue': {
    key: number;
    value: {
      url: string;
      method: string;
      body: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

@Injectable({
  providedIn: 'root'
})
export class OfflineStorageService {
  private dbPromise: Promise<IDBPDatabase<SupervisionDB>>;

  constructor() {
    this.dbPromise = openDB<SupervisionDB>('supervision-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('api-cache')) {
          db.createObjectStore('api-cache', { keyPath: 'url' });
        }
        if (!db.objectStoreNames.contains('sync-queue')) {
          const store = db.createObjectStore('sync-queue', { keyPath: 'timestamp', autoIncrement: true });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  async cacheResponse(url: string, body: any) {
    const db = await this.dbPromise;
    await db.put('api-cache', {
      url,
      body,
      timestamp: Date.now()
    });
  }

  async getCachedResponse(url: string) {
    const db = await this.dbPromise;
    return await db.get('api-cache', url);
  }

  async addToSyncQueue(url: string, method: string, body: any) {
    const db = await this.dbPromise;
    await db.add('sync-queue', {
      url,
      method,
      body,
      timestamp: Date.now()
    });
  }

  async getSyncQueue() {
    const db = await this.dbPromise;
    return await db.getAllFromIndex('sync-queue', 'by-timestamp');
  }

  async removeFromQueue(timestamp: number) {
    const db = await this.dbPromise;
    await db.delete('sync-queue', timestamp);
  }

  async clearQueue() {
      const db = await this.dbPromise;
      await db.clear('sync-queue');
  }
}
