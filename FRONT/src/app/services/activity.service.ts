import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, orderBy, limit, collectionData, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface Activity {
  id?: string;
  user_name: string;
  action: string;
  details: string;
  module: 'Planning' | 'Supervision';
  created_at: any;
  user_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  constructor() {}

  async logActivity(action: string, details: string, module: 'Planning' | 'Supervision') {
    const user = this.authService.currentUserValue;
    const userName = user ? user.username : 'Utilisateur inconnu';
    const userId = user ? user.uid || user.id : '';

    const activity: Activity = {
      user_name: userName,
      user_id: userId,
      action,
      details,
      module,
      created_at: new Date()
    };

    try {
      await addDoc(collection(this.firestore, 'activities'), activity);
    } catch (e) {
      console.error('Failed to log activity', e);
    }
  }

  getRecentActivities(maxLimit = 10, userId?: string): Observable<Activity[]> {
    const actsRef = collection(this.firestore, 'activities');
    let q;
    
    if (userId) {
        q = query(actsRef, where('user_id', '==', userId), orderBy('created_at', 'desc'), limit(maxLimit));
    } else {
        q = query(actsRef, orderBy('created_at', 'desc'), limit(maxLimit));
    }
    
    return collectionData(q, { idField: 'id' }) as Observable<Activity[]>;
  }
}
