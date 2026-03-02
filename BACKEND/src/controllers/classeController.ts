import { Request, Response } from 'express';
import { pool } from '../config/db';

export const getClasses = async (req: Request, res: Response): Promise<void> => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, p.name as parcours_name 
      FROM classes c 
      LEFT JOIN parcours p ON c.parcours_id = p.id 
      ORDER BY c.name ASC
    `);
    res.json(rows);
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
    const [result] = await pool.query(
      'INSERT INTO classes (name, effectif, parcours_id) VALUES (?, ?, ?)',
      [name, effectif, parcours_id || null]
    );
    res.status(201).json({ id: (result as any).insertId, name, effectif, parcours_id });
  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteClasse = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM classes WHERE id = ?', [id]);
    res.json({ message: 'Class deleted successfully' });
  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
