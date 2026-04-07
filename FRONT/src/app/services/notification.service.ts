import { Injectable, inject } from '@angular/core';
import { Firestore, collection, collectionData, doc, addDoc, updateDoc, query, where, deleteDoc, writeBatch, arrayUnion, getDoc } from '@angular/fire/firestore';
import { Observable, of, combineLatest } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Notification {
  id?: string;
  user_id?: string; // the recipient
  role?: string;    // target role (e.g., 'admin')
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  read_by?: string[]; // Array of UIDs that read this (for group notifications)
  link?: string; // Optional URL to navigate to
  created_at?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  constructor() {}

  getUserNotifications(): Observable<Notification[]> {
    return this.authService.currentUser$.pipe(
      switchMap(user => {
        if (!user) return of([]);

        const notifRef = collection(this.firestore, 'notifications');
        
        // Fetch personal notifications
        const qPersonal = query(notifRef, where('user_id', '==', user.uid));
        const obsPersonal = collectionData(qPersonal, { idField: 'id' }) as Observable<any[]>;
        
        // Fetch role-based notifications
        let observables: Observable<any[]>[] = [obsPersonal];
        
        if (user.role) {
            const qRole = query(notifRef, where('role', '==', user.role));
            const obsRole = collectionData(qRole, { idField: 'id' }) as Observable<any[]>;
            observables.push(obsRole);
        }
        
        return combineLatest(observables).pipe(
          map(results => {
            let allData = results.flat();
            const uniqueNotifs = new Map<string, Notification>();
            
            allData.forEach(item => {
                if (!uniqueNotifs.has(item.id)) {
                    uniqueNotifs.set(item.id, item);
                }
            });
            
            return Array.from(uniqueNotifs.values()).map((item: any) => {
                // Determine read status for group notifications
                if (item.role && item.read_by && Array.isArray(item.read_by)) {
                    item.read = item.read_by.includes(user.uid);
                }
                
                if (item.created_at && typeof item.created_at.toDate === 'function') {
                  item.created_at = item.created_at.toDate();
                }
                return item as Notification;
            }).sort((a, b) => {
              const dateA = a.created_at ? (a.created_at.getTime ? a.created_at.getTime() : new Date(a.created_at).getTime()) : 0;
              const dateB = b.created_at ? (b.created_at.getTime ? b.created_at.getTime() : new Date(b.created_at).getTime()) : 0;
              return dateB - dateA;
            });
          })
        );
      })
    );
  }

  createNotification(notification: Notification): Promise<any> {
    const notifRef = collection(this.firestore, 'notifications');
    notification.created_at = new Date();
    if (notification.role) {
        notification.read_by = [];
    } else {
        notification.read = false;
    }
    return addDoc(notifRef, notification);
  }

  async markAsRead(notificationId: string): Promise<void> {
    const user = this.authService.currentUserValue;
    if (!user) return;
    
    const notifDocRef = doc(this.firestore, 
'notifications/' + notificationId);
    const snap = await getDoc(notifDocRef);
    if (!snap.exists()) return;
    
    const data = snap.data();
    if (data['role']) {
        return updateDoc(notifDocRef, { 
            read_by: arrayUnion(user.uid) 
        });
    } else {
        return updateDoc(notifDocRef, { read: true });
    }
  }

  async markAllAsReadForUser(userId: string, notifications: Notification[]): Promise<void> {
    const unreadNotifs = notifications.filter(n => !n.read && n.id);
    if (unreadNotifs.length === 0) return;

    const batch = writeBatch(this.firestore);
    unreadNotifs.forEach(notif => {
      const docRef = doc(this.firestore, 
'notifications/' + notif.id);
      if (notif.role) {
          batch.update(docRef, { read_by: arrayUnion(userId) });
      } else {
          batch.update(docRef, { read: true });
      }
    });
    
    return batch.commit();
  }

  deleteNotification(notificationId: string): Promise<void> {
    const notifDocRef = doc(this.firestore, 
'notifications/' + notificationId);
    return deleteDoc(notifDocRef);
  }
}
