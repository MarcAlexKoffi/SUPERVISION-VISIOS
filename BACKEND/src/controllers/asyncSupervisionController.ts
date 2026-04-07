import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

const COLLECTION_NAME = 'async_supervisions';

// Créer une supervision asynchrone
export const createAsyncSupervision = async (req: AuthRequest, res: Response) => {
  try {
    const supervisorId = req.user?.id;
    const {
      teacherId, ueId, classeId, week, status, observations
    } = req.body;

    if (!teacherId || !ueId || !week || !status) {
      return res.status(400).json({ message: 'L\'enseignant, l\'UE, la semaine et le statut sont obligatoires.' });
    }

    const newSupervision = {
      supervisor_id: supervisorId,
      teacher_id: teacherId,
      ue_id: ueId,
      classe_id: classeId || null,
      week, // ex: "Semaine 4" ou "2024-W15"
      status, // "Fait", "Partiel", "Non fait"
      observations: observations || '',
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection(COLLECTION_NAME).add(newSupervision);

    res.status(201).json({
      message: 'Supervision asynchrone enregistrée avec succès.',
      id: docRef.id
    });
  } catch (error) {
    console.error('Erreur lors de la création de la supervision asynchrone:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer toutes les supervisions asynchrones (avec filtres optionnels)
export const getAsyncSupervisions = async (req: Request, res: Response) => {
  try {
    const { teacher_id, ue_id, week } = req.query;
    let query: FirebaseFirestore.Query = db.collection(COLLECTION_NAME);

    if (teacher_id) query = query.where('teacher_id', '==', teacher_id);
    if (ue_id) query = query.where('ue_id', '==', ue_id);
    if (week) query = query.where('week', '==', week);

    const snapshot = await query.orderBy('created_at', 'desc').get();
    const supervisions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(supervisions);
  } catch (error) {
    console.error('Erreur lors de la récupération des supervisions asynchrones:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Récupérer une supervision asynchrone par son ID
export const getAsyncSupervisionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Supervision asynchrone introuvable.' });
    }

    res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Erreur lors de la récupération de la supervision asynchrone:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Mettre à jour une supervision asynchrone
export const updateAsyncSupervision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    await db.collection(COLLECTION_NAME).doc(id).update(updateData);
    
    res.status(200).json({ message: 'Supervision asynchrone mise à jour avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la supervision asynchrone:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Supprimer une supervision asynchrone
export const deleteAsyncSupervision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.collection(COLLECTION_NAME).doc(id).delete();
    res.status(200).json({ message: 'Supervision asynchrone supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la supervision asynchrone:', error);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};
