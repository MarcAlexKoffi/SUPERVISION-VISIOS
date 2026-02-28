// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/db';
import { generateToken } from '../utils/token';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

interface User extends RowDataPacket {
  id: number;
  username: string;
  password?: string;
  role: string;
}

export const register = async (req: Request, res: Response) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Vérifier si l'utilisateur existe déjà
    const [existingUsers] = await pool.query<User[]>('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Cet utilisateur existe déjà.' });
    }

    // AVANT (Avec hachage) : const hashedPassword = await bcrypt.hash(password, 10);
    // MAINTENANT (Mot de passe en clair) :
    const roleName = role || 'user'; // Rôle par défaut 'user'

    // Récupérer l'ID du rôle
    const [roleRows] = await pool.query<RowDataPacket[]>('SELECT id FROM roles WHERE name = ?', [roleName]);
    if (roleRows.length === 0) {
        return res.status(400).json({ message: `Le rôle '${roleName}' n'existe pas.` });
    }
    const roleId = roleRows[0].id;

    // Insérer le nouvel utilisateur (mot de passe en clair)
    const [result] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (username, password, email, role_id) VALUES (?, ?, ?, ?)',
      [username, password, email || null, roleId]
    );

    const userId = result.insertId;
    // On génère le token avec le NOM du rôle pour que le front continue de fonctionner
    const token = generateToken(userId, roleName);

    res.status(201).json({ 
        message: 'Utilisateur créé avec succès.',
        token,
        user: { id: userId, username, email, role: roleName }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de l\'enregistrement.' });
  }
};

export const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Rechercher l'utilisateur avec son rôle
    const query = `
        SELECT u.*, r.name as role_name 
        FROM users u 
        LEFT JOIN roles r ON u.role_id = r.id 
        WHERE u.username = ?
    `;
    const [rows] = await pool.query<any[]>(query, [username]);
    
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const user = rows[0];

    // Vérifier le mot de passe (Comparaison directe, sans hachage)
    // AVANT : const isPasswordValid = await bcrypt.compare(password, user.password as string);
    const isPasswordValid = (password === user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    // Le rôle peut être null si la jointure échoue (ne devrait pas arriver avec FK)
    const userRole = user.role_name || 'user';

    // Générer le token
    const token = generateToken(user.id, userRole);

    // Retourner les infos
    res.json({
        message: 'Connexion réussie.',
        token,
        user: { 
            id: user.id, 
            username: user.username, 
            role: userRole 
        }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
};
