
import { Request, Response } from 'express';
import { pool } from '../config/db';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const getAllUEs = async (req: Request, res: Response) => {
  try {
    console.log('Fetching all UEs...');
    const [rows] = await pool.query('SELECT * FROM ues ORDER BY created_at DESC');
    console.log(`Found ${Array.isArray(rows) ? rows.length : 0} UEs`);
    res.json(rows);
  } catch (error) {
    console.error('Error in getAllUEs:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des UEs' });
  }
};

export const createUE = async (req: Request, res: Response) => {
  const { code, name, responsible, students_count, modules_count, level, semester, phase, department } = req.body;
  
  if (!code || !name) {
    return res.status(400).json({ message: 'Code et Nom sont obligatoires' });
  }

  try {
    const query = `
      INSERT INTO ues (code, name, responsible, students_count, modules_count, level, semester, phase, department)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await pool.query<ResultSetHeader>(query, [code, name, responsible, students_count, modules_count, level, semester, phase, department]);
    
    res.status(201).json({ id: result.insertId, ...req.body });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Ce code UE existe déjà' });
    }
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'UE' });
  }
};

export const updateUE = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { code, name, responsible, students_count, modules_count, level, semester, phase, department } = req.body;

  try {
    const query = `
      UPDATE ues 
      SET code=?, name=?, responsible=?, students_count=?, modules_count=?, level=?, semester=?, phase=?, department=?
      WHERE id=?
    `;
    await pool.query(query, [code, name, responsible, students_count, modules_count, level, semester, phase, department, id]);
    
    res.json({ message: 'UE mise à jour avec succès', id, ...req.body });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de l\'UE' });
  }
};

export const deleteUE = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM ues WHERE id = ?', [id]);
    res.json({ message: 'UE supprimée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression de l\'UE' });
  }
};
