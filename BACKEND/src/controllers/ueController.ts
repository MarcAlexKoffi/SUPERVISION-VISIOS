
import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllUEs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    // Firestore Query
    let uesRef = db.collection('ues');
    let snapshot;

    if (userRole === 'admin') {
         snapshot = await uesRef.orderBy('created_at', 'desc').get();
    } else {
         snapshot = await uesRef.where('user_id', '==', userId).orderBy('created_at', 'desc').get();
    }
    
    // Handle index requirement error or empty
    if (snapshot.empty) {
        // Fallback or just empty
        res.json([]);
        return;
    }

    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllUEs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des UEs' });
  }
};

export const createUE = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const { code, name, responsible, students_count, modules_count, level, semester, phase, department } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ message: 'Code et Nom sont obligatoires' });
  }

  try {
    const uesRef = db.collection('ues');
    
    const existing = await uesRef.where('code', '==', code).get();
    if (!existing.empty) {
        return res.status(409).json({ message: 'Ce code UE existe déjà' });
    }

    const newUE = {
        code, name, responsible, students_count, modules_count, level, semester, phase, department,
        user_id: userId,
        created_at: new Date()
    };

    const docRef = await uesRef.add(newUE);
    
    // On retourne l'ID document firestore
    res.status(201).json({ id: docRef.id, ...newUE });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'UE' });
  }
};

export const updateUE = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;
  const { code, name, responsible, students_count, modules_count, level, semester, phase, department } = req.body;

  try {
    const ueRef = db.collection('ues').doc(id);
    const ueDoc = await ueRef.get();

    if (!ueDoc.exists) {
        return res.status(404).json({ message: 'UE non trouvée' });
    }

    // Check ownership
    if (userRole !== 'admin') {
        const data = ueDoc.data();
        if (data?.user_id !== userId) {
            return res.status(403).json({ message: 'Non autorisé à modifier cette UE' });
        }
    }

    const updateData = {
        code, name, responsible, students_count, modules_count, level, semester, phase, department,
        updated_at: new Date()
    };
    
    await ueRef.update(updateData);
    
    res.json({ message: 'UE mise à jour avec succès', id, ...updateData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'UE' });
  }
};

export const deleteUE = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  try {
    const ueRef = db.collection('ues').doc(id);
    const ueDoc = await ueRef.get();

    if (!ueDoc.exists) {
        return res.status(404).json({ message: 'UE non trouvée' });
    }

    // Check ownership
    if (userRole !== 'admin') {
        const data = ueDoc.data();
        if (data?.user_id !== userId) {
            return res.status(403).json({ message: 'Non autorisé à supprimer cette UE' });
        }
    }
    
    await ueRef.delete();
    res.json({ message: 'UE supprimée' });

  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erreur lors de la suppression' });
  }
};
