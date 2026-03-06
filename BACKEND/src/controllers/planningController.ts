import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const createPlanning = async (req: AuthRequest, res: Response) => {
  try {
    const {
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, title, description
    } = req.body;

    if (!ue_id && !title) {
        return res.status(400).json({ message: "Veuillez sélectionner une UE ou saisir un titre pour l'activité." });
    }
    if (!parcours || !teacher_id || !date || !end_time) {
      return res.status(400).json({ message: 'Les champs requis sont manquants (Classe, Enseignant, Date, Heure de fin).' });
    }

    // Prepare denormalized data
    let ueData: any = {};
    if (ue_id) {
        const ueDoc = await db.collection('ues').doc(ue_id).get();
        if (ueDoc.exists) ueData = { ue_code: ueDoc.data()?.code, ue_name: ueDoc.data()?.name };
    }

    let teacherData: any = {};
    if (teacher_id) {
        const tDoc = await db.collection('teachers').doc(teacher_id).get();
        if (tDoc.exists) teacherData = { teacher_first_name: tDoc.data()?.first_name, teacher_last_name: tDoc.data()?.last_name };
    }

    const newPlanning = {
      parcours, ue_id: ue_id || null, teacher_id, date, start_time: start_time || null, end_time, 
      session_type: session_type || 'Activite', platform: platform || '', visio_link: visio_link || '', 
      status: status || 'À superviser', title: title || null, description: description || null,
      ...ueData,
      ...teacherData,
      created_at: new Date()
    };
    
    const docRef = await db.collection('plannings').add(newPlanning);

    res.status(201).json({
      message: 'Séance planifiée avec succès',
      id: docRef.id
    });
  } catch (error: any) {
    console.error('Error in createPlanning:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la création de la séance.',
      error: error.message,
      stack: error.stack
    });
  }
};

export const getPlannings = async (req: AuthRequest, res: Response) => {
  try {
    const { parcours, startDate, endDate, status } = req.query;
    
    let query: FirebaseFirestore.Query = db.collection('plannings');

    // Ideally use composite indexes for multiple where clauses
    if (parcours) query = query.where('parcours', '==', parcours);
    
    if (status) query = query.where('status', '==', status);

    if (startDate && endDate) {
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    }
    
    // Sort needs index manually created for combinations. 
    // Fallback to simpler query + in-memory sort or user must create index in Firebase Console
    try {
        // En Firestore, trier sur plusieurs champs nécessite un index composite.
        // On simplifie ici pour trier d'abord par date.
        query = query.orderBy('date', 'asc');
    } catch (e) {
        // If index missing, sorting might fail or return partial
         console.warn("Sorting skipped or failed, check Firestore Indexes");
    }

    const snapshot = await query.get();
    let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Tri en mémoire pour le second champ (start_time)
    rows.sort((a: any, b: any) => {
         const timeA = a.start_time || '';
         const timeB = b.start_time || '';
         return timeA.localeCompare(timeB);
    });
    
    res.json(rows);
  } catch (error: any) {
    console.error('Error in getPlannings:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération des séances.',
      error: error.message,
      stack: error.stack
    });
  }
};

export const updatePlanning = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, title, description
    } = req.body;

    const planningRef = db.collection('plannings').doc(id);
    const doc = await planningRef.get();
    if (!doc.exists) return res.status(404).json({ message: "Planning not found" });

    // Update denormalized if changing relations (simplified)
    const updateData: any = {};
    if (parcours) updateData.parcours = parcours;
    if (date) updateData.date = date;
    if (start_time !== undefined) updateData.start_time = start_time;
    if (end_time !== undefined) updateData.end_time = end_time;
    if (session_type) updateData.session_type = session_type;
    if (teacher_id) updateData.teacher_id = teacher_id;
    if (ue_id) updateData.ue_id = ue_id;
    if (status) updateData.status = status;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;

    await planningRef.update(updateData);

    res.json({ message: 'Séance mise à jour', id });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

export const deletePlanning = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const ref = db.collection('plannings').doc(id);
        const doc = await ref.get();
        if (!doc.exists) return res.status(404).json({ message: 'Séance non trouvée.' });

        await ref.delete();
        res.json({ message: 'Séance supprimée.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erreur lors de la suppression.' });
    }
};
