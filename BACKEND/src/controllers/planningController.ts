import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

export const createPlanning = async (req: AuthRequest, res: Response) => {
  try {
    const {
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status
    } = req.body;

    if (!parcours || !ue_id || !teacher_id || !date || !start_time || !end_time) {
      return res.status(400).json({ message: 'Les champs requis sont manquants.' });
    }

    const query = `
      INSERT INTO plannings (
        parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type || 'CM', platform || '', visio_link || '', status || 'À superviser'
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
      parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status
    } = req.body;

    const query = `
      UPDATE plannings 
      SET parcours = COALESCE(?, parcours), 
          ue_id = COALESCE(?, ue_id), 
          teacher_id = COALESCE(?, teacher_id), 
          date = COALESCE(?, date), 
          start_time = COALESCE(?, start_time), 
          end_time = COALESCE(?, end_time), 
          session_type = COALESCE(?, session_type), 
          platform = COALESCE(?, platform), 
          visio_link = COALESCE(?, visio_link), 
          status = COALESCE(?, status)
      WHERE id = ?
    `;

    const values = [parcours, ue_id, teacher_id, date, start_time, end_time, session_type, platform, visio_link, status, id];

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
