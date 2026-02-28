// src/controllers/teacherController.ts
import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export const getAllTeachers = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM teachers ORDER BY last_name, first_name');
    res.json(rows);
  } catch (error) {
    console.error('Erreur getAllTeachers:', error);
    res.status(500).json({ message: "Erreur lors de la récupération des enseignants." });
  }
};

export const getTeacherById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM teachers WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Enseignant non trouvé." });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur getTeacherById:', error);
    res.status(500).json({ message: "Erreur serveur." });
  }
};

export const createTeacher = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, department } = req.body;
    
    if (!firstName || !lastName) {
        return res.status(400).json({ message: "Le nom et le prénom sont obligatoires." });
    }

    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO teachers (first_name, last_name, email, department) VALUES (?, ?, ?, ?)',
      [firstName, lastName, email, department]
    );

    res.status(201).json({ 
        message: "Enseignant ajouté.",
        id: result.insertId,
        teacher: { id: result.insertId, firstName, lastName, email, department }
    });
  } catch (error) {
    console.error('Erreur createTeacher:', error);
    res.status(500).json({ message: "Erreur lors de l'ajout." });
  }
};

export const updateTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, department, status } = req.body;

    await pool.query(
      'UPDATE teachers SET first_name = ?, last_name = ?, email = ?, department = ?, status = ? WHERE id = ?',
      [firstName, lastName, email, department, status, id]
    );

    res.json({ message: "Enseignant mis à jour." });
  } catch (error) {
    console.error('Erreur updateTeacher:', error);
    res.status(500).json({ message: "Erreur lors de la mise à jour." });
  }
};

export const deleteTeacher = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM teachers WHERE id = ?', [id]);
    res.json({ message: "Enseignant supprimé." });
  } catch (error) {
    console.error('Erreur deleteTeacher:', error);
    res.status(500).json({ message: "Erreur lors de la suppression." });
  }
};
