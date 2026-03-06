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

    // Stratégie pour éviter les erreurs d'Index manquant (Composite Index) :
    // Si on filtre par une plage de dates (Range), on ne doit pas ajouter de filtre d'égalité (Equality)
    // sur d'autres champs sans avoir créé un index composite. 
    // Pour éviter cela, on privilégie le filtre par date en base, et on filtre le reste (parcours, status) en mémoire.

    const hasDateRange = startDate && endDate;

    if (hasDateRange) {
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
    } else {
        // Si pas de dates, on peut utiliser les filtres d'égalité directement
        if (parcours) query = query.where('parcours', '==', parcours);
        if (status) query = query.where('status', '==', status);
    }

    // On évite le query.orderBy('date') ici qui peut aussi nécessiter un index composite
    // On fera le tri complet en mémoire
    
    const snapshot = await query.get();
    
    let rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Filtrage en mémoire si on est passés par la requête Date Range
    if (hasDateRange) {
        if (parcours) {
            rows = rows.filter((r: any) => r.parcours === parcours);
        }
        if (status) {
            rows = rows.filter((r: any) => r.status === status);
        }
    }

    // Tri en mémoire (Date puis Heure)
    rows.sort((a: any, b: any) => {
         const dateA = a.date || '';
         const dateB = b.date || '';
         const dateCompare = dateA.localeCompare(dateB);
         
         if (dateCompare !== 0) return dateCompare;

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
