import { Request, Response } from 'express';
import { db } from '../config/db';

export const getParcours = async (req: Request, res: Response): Promise<void> => {
  try {
    const snapshot = await db.collection('parcours').orderBy('name', 'asc').get();
    const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(rows);
  } catch (error) {
    console.error('Error fetching parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createParcours = async (req: Request, res: Response): Promise<void> => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    res.status(400).json({ message: 'Code and name are required' });
    return;
  }
  try {
    const newParcours = { code, name, description: description || null };
    const docRef = await db.collection('parcours').add(newParcours);
    res.status(201).json({ id: docRef.id, ...newParcours });
  } catch (error) {
    console.error('Error creating parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteParcours = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await db.collection('parcours').doc(id).delete();
    res.json({ message: 'Parcours deleted successfully' });
  } catch (error) {
    console.error('Error deleting parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateParcours = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { code, name, description } = req.body; // Added description
  if (!code || !name) {
    res.status(400).json({ message: 'Code and name are required' });
    return;
  }
  try {
    const updateData = { code, name, description: description || null };
    await db.collection('parcours').doc(id).update(updateData);
    res.status(200).json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
