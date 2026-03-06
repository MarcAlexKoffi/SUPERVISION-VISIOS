import { Request, Response } from 'express';
import { db } from '../config/db';

export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const classesRef = db.collection('classes');
    const snapshot = await classesRef.orderBy('name', 'asc').get();
    
    if (snapshot.empty) {
        res.json([]);
        return;
    }

    const classes = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name,
            effectif: data.effectif,
            parcours_id: data.parcours_id,
            parcours_name: data.parcours // Changed to 'parcours' stored directly or fetch from ID if preferred, but existing migration stored denormalized 'parcours' name
        };
    });
    res.json(classes);
  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createClasse = async (req: Request, res: Response): Promise<void> => {
  const { name, effectif, parcours_id } = req.body;
  if (!name || isNaN(effectif)) {
    res.status(400).json({ message: 'Name and effectif are required' });
    return;
  }
  
  try {
    let parcoursName = null;
    if (parcours_id) {
        const pDoc = await db.collection('parcours').doc(parcours_id).get();
        if (pDoc.exists) {
            parcoursName = pDoc.data()?.name;
        }
    }

    const newClass = {
        name,
        effectif,
        parcours_id: parcours_id || null,
        parcours: parcoursName,
        created_at: new Date()
    };

    const docRef = await db.collection('classes').add(newClass);
    res.status(201).json({ id: docRef.id, ...newClass });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteClasse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await db.collection('classes').doc(id).delete();
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateClasse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { name, effectif, parcours_id } = req.body;
  if (!name || isNaN(effectif)) {
    res.status(400).json({ message: 'Name and effectif are required' });
    return;
  }
  
  try {
     let parcoursName = null;
     if (parcours_id) {
         const pDoc = await db.collection('parcours').doc(parcours_id).get();
         if (pDoc.exists) {
             parcoursName = pDoc.data()?.name;
         }
     }

    const updateData: any = { name, effectif, parcours_id: parcours_id || null };
    if (parcoursName) updateData.parcours = parcoursName;

    await db.collection('classes').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating classe:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
