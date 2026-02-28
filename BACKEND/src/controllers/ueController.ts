
import { Request, Response } from 'express';
import { pool } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

export const getAllUEs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    // console.log('Fetching all UEs for user:', userId, 'Role:', userRole);
    
    // Base Select
    let query = 'SELECT * FROM ues';
    const params: any[] = [];

    // Filter if not admin
    if (userRole !== 'admin') {
       query += ' WHERE user_id = ?';
       params.push(userId);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(query, params);
    // console.log(`Found ${Array.isArray(rows) ? rows.length : 0} UEs`);
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
    const query = `
      INSERT INTO ues (code, name, responsible, students_count, modules_count, level, semester, phase, department, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [code, name, responsible, students_count, modules_count, level, semester, phase, department, userId]);
    
    res.status(201).json({ id: result.insertId, ...req.body, user_id: userId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ce code UE existe déjà' });
    }
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
    // Check ownership if not admin
    if (userRole !== 'admin') {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT user_id FROM ues WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'UE non trouvée' });
        // Assuming undefined user_id (legacy data) is editable only by admin if we want strict mode, or maybe user? 
        // Let's assume user_id must match.
        if (existing[0].user_id !== userId) {
            return res.status(403).json({ message: 'Non autorisé à modifier cette UE' });
        }
    }

    const query = `
      UPDATE ues 
      SET code=?, name=?, responsible=?, students_count=?, modules_count=?, level=?, semester=?, phase=?, department=?
      WHERE id=?
    `;
    
    // Note: We don't update user_id here.
    await pool.query(query, [code, name, responsible, students_count, modules_count, level, semester, phase, department, id]);
    
    res.json({ message: 'UE mise à jour avec succès', id, ...req.body });
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
    // Check ownership if not admin
    if (userRole !== 'admin') {
        const [existing] = await pool.query<RowDataPacket[]>('SELECT user_id FROM ues WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'UE non trouvée' });
        if (existing[0].user_id !== userId) {
            return res.status(403).json({ message: 'Non autorisé à supprimer cette UE' });
        }
    }

    await pool.query('DELETE FROM ues WHERE id = ?', [id]);
    res.json({ message: 'UE supprimée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'UE' });
  }
};
