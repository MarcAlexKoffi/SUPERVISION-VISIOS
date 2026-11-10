import { Injectable, inject } from '@angular/core';
import { Firestore, doc, runTransaction, serverTimestamp } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Academic3BConfig, isIsoDate, normalizedConfig } from '../shared/utils/academic-3b';

@Injectable({ providedIn: 'root' })
export class AcademicTrackingService {
  private firestore = inject(Firestore);
  private auth = inject(AuthService);

  /**
   * Persistance additive : écrit UNIQUEMENT dans `ues/{id}.academic3b`.
   * Révision optimiste : pas de perte silencieuse si deux admins modifient la même UE.
   * Les règles Firestore côté serveur restent la véritable autorité.
   */
  async saveConfig(ueId: string, raw: Academic3BConfig, expectedRevision: number): Promise<void> {
    const user = this.auth.currentUserValue;
    if (!user?.uid || user.role !== 'admin') throw new Error('Seul un administrateur peut modifier le pilotage académique.');
    if (!ueId || ueId.includes('/')) throw new Error('Identifiant UE non valide.');
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new Error('Révision invalide.');
    const inputTarget: unknown = raw.required_sessions;
    if (inputTarget !== null && inputTarget !== undefined && inputTarget !== '' &&
      (!Number.isSafeInteger(Number(inputTarget)) || Number(inputTarget) <= 0 || Number(inputTarget) > 500)) {
      throw new Error('Le nombre de séances doit être un entier compris entre 1 et 500.');
    }
    const inputCadence: unknown = raw.cadence_per_week;
    if (inputCadence !== null && inputCadence !== undefined && inputCadence !== '' &&
      (!Number.isFinite(Number(inputCadence)) || Number(inputCadence) < 0.1 || Number(inputCadence) > 14)) {
      throw new Error('La cadence doit être comprise entre 0,1 et 14 séances par semaine.');
    }
    if ((raw.exams || []).some(e=>!isIsoDate(e.date) || !String(e.session || '').trim())) {
      throw new Error('Chaque examen doit comporter une date valide et une session.');
    }
    const examKeys = (raw.exams || []).map(e => `${e.date}|${String(e.session || '').trim().toLocaleLowerCase('fr')}|${String(e.class_id || '')}`);
    if (new Set(examKeys).size !== examKeys.length) throw new Error('Une même session d’examen est déjà programmée pour cette date et cette classe.');
    const cleaned=normalizedConfig(raw);
    // No undefined Firestore values, even inside nested objects.
    const safeConfig: Academic3BConfig = {
      required_sessions: cleaned.required_sessions ?? null,
      class_ids: cleaned.class_ids || [],
      cadence_per_week: cleaned.cadence_per_week ?? null,
      exams: cleaned.exams || [],
      kit_items: cleaned.kit_items || [],
      target_end_date: cleaned.target_end_date || ''
    };
    const ref = doc(this.firestore, `ues/${ueId}`);
    await runTransaction(this.firestore, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Cette UE n’existe plus. Actualisez le tableau.');
      const revision=Number(snap.data()['academic3b_revision'] ?? 0);
      if (revision !== expectedRevision) {
        throw new Error('Cette fiche a été modifiée par un autre utilisateur. Actualisez avant de réenregistrer.');
      }
      tx.update(ref, {
        academic3b: safeConfig,
        academic3b_revision: revision + 1,
        academic3b_updated_at: serverTimestamp(),
        academic3b_updated_by: user.uid
      });
    });
  }
}
