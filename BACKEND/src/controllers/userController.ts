import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

interface UserOutput extends RowDataPacket {
  id: number;
  username: string;
  role: string;
  created_at: Date;
}

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<UserOutput[]>(
      'SELECT id, username, role, created_at FROM users'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username et mot de passe requis.' });
  }

  const userRole = role || 'user';

  try {
     // Check user exist
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
        return res.status(409).json({ message: 'Utilisateur existant.' });
    }

    // Insert (password plain for now per existing code)
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, password, userRole]
    );

    res.status(201).json({ 
        message: 'Utilisateur créé.', 
        user: { id: result.insertId, username, role: userRole } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur.' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const { username, password, role } = req.body;

  try {
    // Check if user exists
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    let query = 'UPDATE users SET username = ?, role = ?';
    let params: any[] = [username, role];

    if (password) {
      query += ', password = ?';
      params.push(password); // plain text for now
    }
    
    query += ' WHERE id = ?';
    params.push(userId);

    await pool.query(query, params);

    res.json({ message: 'Utilisateur mis à jour avec succès.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};
