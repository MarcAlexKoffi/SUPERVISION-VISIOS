
import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

export const createSupervision = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const {
      teacherName, module, level, sessionNumber, date, startTime, endTime, platform,
      teacherId, ueId, // Nouveaux champs optionnels
      presentCount, totalStudents,
      technical, pedagogical,
      observations, supervisorName,
      supervisorSignature, teacherSignature
    } = req.body;

    // Validation basique (on garde la validation existante pour ne rien casser)
    if (!teacherName || !module || !date) {
        return res.status(400).json({ message: 'Les champs nom enseignant, module et date sont obligatoires.' });
    }

    const query = `
      INSERT INTO supervision_forms (
        user_id, teacher_name, module, level, session_number, visit_date, start_time, end_time, platform,
        teacher_id, ue_id,
        present_count, total_students,
        tech_internet, tech_audio_video, tech_punctuality,
        ped_objectives, ped_content_mastery, ped_interaction, ped_tools_usage,
        observations, supervisor_name,
        supervisor_signature, teacher_signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId, teacherName, module, level, sessionNumber, date, startTime, endTime, platform,
      teacherId || null, ueId || null,
      presentCount, totalStudents,
      technical?.internet, technical?.audioVideo, technical?.punctuality,
      pedagogical?.objectives, pedagogical?.contentMastery, pedagogical?.interaction, pedagogical?.toolsUsage,
      observations, supervisorName,
      supervisorSignature, teacherSignature
    ];

    const [result] = await pool.query<ResultSetHeader>(query, values);

    res.status(201).json({ 
      message: 'Fiche de supervision enregistrée avec succès.',
      id: result.insertId 
    });

  } catch (error) {
    console.error('Erreur createSupervision:', error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de la fiche.' });
  }
};

export const getAllSupervisions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    let query = `
      SELECT sf.*, u.username as creator_username,
             t.first_name as teacher_firstname, t.last_name as teacher_lastname,
             ue.name as ue_real_name, ue.code as ue_code
      FROM supervision_forms sf
      LEFT JOIN users u ON sf.user_id = u.id
      LEFT JOIN teachers t ON sf.teacher_id = t.id
      LEFT JOIN ues ue ON sf.ue_id = ue.id
    `;
    
    const params: any[] = [];

    // If not admin, only show own supervisions
    if (userRole !== 'admin') {
        query += ` WHERE sf.user_id = ?`;
        params.push(userId);
    }

    query += ` ORDER BY sf.visit_date DESC, sf.created_at DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Erreur getAllSupervisions:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des fiches.' });
  }
};

export const getSupervisionById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT sf.*, u.username as creator_username,
             t.first_name as teacher_firstname, t.last_name as teacher_lastname,
             ue.name as ue_real_name, ue.code as ue_code
      FROM supervision_forms sf
      LEFT JOIN users u ON sf.user_id = u.id
      LEFT JOIN teachers t ON sf.teacher_id = t.id
      LEFT JOIN ues ue ON sf.ue_id = ue.id
      WHERE sf.id = ?
    `;
    const [rows] = await pool.query<RowDataPacket[]>(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Fiche non trouvée.' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Erreur getSupervisionById:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la fiche.' });
  }
};

export const updateSupervision = async (req: AuthRequest, res: Response) => {
    // À implémenter si besoin de modification
    res.status(501).json({ message: 'Not implemented' });
};

export const deleteSupervision = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Vérifier si l'utilisateur est admin ou propriétaire (optionnel, ici admin only selon route)
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM supervision_forms WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Fiche non trouvée.' });
    }

    res.json({ message: 'Fiche supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur deleteSupervision:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};
