import { Request, Response } from 'express';
import { pool } from '../config/db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { AuthRequest } from '../middleware/authMiddleware';

interface UserOutput extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: Date;
}

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const [rows] = await pool.query<UserOutput[]>(
      'SELECT u.id, u.username, u.email, r.name as role, u.created_at FROM users u LEFT JOIN roles r ON u.role_id = r.id'
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username et mot de passe requis.' });
  }

  const roleName = role || 'user';

  try {
     // Check user exist
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
        return res.status(409).json({ message: 'Utilisateur existant.' });
    }

    // Get role_id
    const [roles] = await pool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', [roleName]);
    let roleId = null; 
    if (roles.length > 0) {
        roleId = roles[0].id;
    } else {
        // Fallback to 'user' if role not found
        const [defaultRole] = await pool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = "user"');
        if (defaultRole.length > 0) roleId = defaultRole[0].id;
    }

    // Insert (password plain for now per existing code)
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)',
      [username, password, email || null, roleId]
    );

    res.status(201).json({ 
        message: 'Utilisateur créé.', 
        user: { id: result.insertId, username, email, role: roleName } 
    });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage && error.sqlMessage.includes('email')) {
             return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }
        return res.status(409).json({ message: 'Utilisateur ou email existant.' });
    }
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur.', error: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const { username, password, email, role } = req.body;

  try {
    // Check if user exists
    const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM users WHERE id = ?', [userId]);
    if (existing.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    let roleId = null;
    if (role) {
        const [roles] = await pool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', [role]);
        if (roles.length > 0) {
            roleId = roles[0].id;
        }
    }

    // Start building update query
    let query = 'UPDATE users SET username = ?';
    let params: any[] = [username];

    // Assuming username is always provided. If not, this logic might be brittle, but consistent with previous code.
    
    if (email !== undefined) {
        query += ', email = ?';
        params.push(email);
    }

    if (roleId) {
        query += ', role_id = ?';
        params.push(roleId);
    }

    if (password) {
      query += ', password = ?';
      params.push(password); // plain text for now
    }
    
    query += ' WHERE id = ?';
    params.push(userId);

    await pool.query(query, params);

    res.json({ message: 'Utilisateur mis à jour avec succès.' });
  } catch (error: any) {
    console.error(error);
    if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage && error.sqlMessage.includes('email')) {
             return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }
        return res.status(409).json({ message: 'Utilisateur ou email existant.' });
    }
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
