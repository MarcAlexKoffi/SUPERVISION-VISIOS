import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

export const createPlanning = async (req: AuthRequest, res: Response) => {
  try {
    const {
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, title, description
    } = req.body;

    // Validation: Require either ue_id OR title
    if (!ue_id && !title) {
        return res.status(400).json({ message: "Veuillez sélectionner une UE ou saisir un titre pour l'activité." });
    }

    if (!parcours || !teacher_id || !date || !end_time) {
      return res.status(400).json({ message: 'Les champs requis sont manquants (Classe, Enseignant, Date, Heure de fin).' });
    }

    const query = `
      INSERT INTO plannings (
        parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, title, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      parcours, ue_id || null, teacher_id, date, start_time || null, end_time, session_type || 'Activite', platform || '', visio_link || '', status || 'À superviser', title || null, description || null
    ];

    const [result] = await pool.query<ResultSetHeader>(query, values);

    res.status(201).json({
      message: 'Séance planifiée avec succès',
      id: result.insertId
    });
  } catch (error) {
    console.error('Error in createPlanning:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la séance.' });
  }
};

export const getPlannings = async (req: AuthRequest, res: Response) => {
  try {
    const { parcours, startDate, endDate, status } = req.query;
    
    let query = `
      SELECT p.*, 
             u.code as ue_code, u.name as ue_name, 
             t.first_name as teacher_first_name, t.last_name as teacher_last_name
      FROM plannings p
      LEFT JOIN ues u ON p.ue_id = u.id
      LEFT JOIN teachers t ON p.teacher_id = t.id
      WHERE 1=1
    `;
    const values: any[] = [];

    if (parcours) {
      query += ` AND p.parcours = ?`;
      values.push(parcours);
    }
    
    if (startDate && endDate) {
      query += ` AND p.date BETWEEN ? AND ?`;
      values.push(startDate, endDate);
    }

    if (status) {
      query += ` AND p.status = ?`;
      values.push(status);
    }

    query += ` ORDER BY p.date ASC, p.start_time ASC`;

    const [rows] = await pool.query<RowDataPacket[]>(query, values);
    res.json(rows);
  } catch (error) {
    console.error('Error in getPlannings:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des séances.' });
  }
};

export const updatePlanning = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, title, description
    } = req.body;

    // Helper to add field if not undefined
    const fields: string[] = [];
    const values: any[] = [];
    
    // Helper function to push if defined
    const add = (col: string, val: any) => {
        if (val !== undefined) {
            fields.push(`${col} = ?`);
            values.push(val);
        }
    };

    add('parcours', parcours);
    add('ue_id', ue_id); // Can receive null to unset
    add('teacher_id', teacher_id);
    add('date', date);
    add('start_time', start_time);
    add('end_time', end_time);
    add('session_type', session_type);
    add('platform', platform);
    add('visio_link', visio_link);
    add('status', status);
    add('title', title);
    add('description', description);

    if (fields.length === 0) {
        return res.json({ message: 'Aucune donnée à modifier.' });
    }

    values.push(id);
    const query = `UPDATE plannings SET ${fields.join(', ')} WHERE id = ?`;

    const [result] = await pool.query<ResultSetHeader>(query, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Séance non trouvée.' });
    }

    res.json({ message: 'Séance mise à jour avec succès.' });
  } catch (error) {
    console.error('Error in updatePlanning:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la séance.' });
  }
};

export const deletePlanning = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = `DELETE FROM plannings WHERE id = ?`;
    const [result] = await pool.query<ResultSetHeader>(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Séance non trouvée.' });
    }

    res.json({ message: 'Séance supprimée.' });
  } catch (error) {
    console.error('Error in deletePlanning:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression de la séance.' });
  }
};
