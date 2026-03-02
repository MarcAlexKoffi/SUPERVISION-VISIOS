import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getParcours = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query('SELECT * FROM parcours ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const createParcours = async (req: Request, res: Response): Promise<void> => {
  const { code, name } = req.body;
  if (!code || !name) {
    res.status(400).json({ message: 'Code and name are required' });
    return;
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO parcours (code, name) VALUES (?, ?)',
      [code, name]
    );
    res.status(201).json({ id: (result as any).insertId, code, name });
  } catch (error) {
    console.error('Error creating parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteParcours = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM parcours WHERE id = ?', [id]);
    res.json({ message: 'Parcours deleted successfully' });
  } catch (error) {
    console.error('Error deleting parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateParcours = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { code, name } = req.body;
  if (!code || !name) {
    res.status(400).json({ message: 'Code and name are required' });
    return;
  }
  try {
    await pool.query('UPDATE parcours SET code = ?, name = ? WHERE id = ?', [code, name, id]);
    res.status(200).json({ id, code, name });
  } catch (error) {
    console.error('Error updating parcours:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
