// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/db';
import { generateToken } from '../utils/token';

// interface User removed as no longer needed for MySQL typing

export const register = async (req: Request, res: Response) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    // Check if user exists
    const usersRef = db.collection('users');
    const existingUser = await usersRef.where('username', '==', username).get();
    
    if (!existingUser.empty) {
      return res.status(409).json({ message: 'Cet utilisateur existe déjà.' });
    }

    const roleName = role || 'user';
    
    // Create new user (Storing plain password as per previous logic, but should be hashed)
    const newUser = {
      username,
      password, // Ideally hash this
      email: email || null,
      role: roleName,
      created_at: new Date()
    };

    const docRef = await usersRef.add(newUser);
    const userDoc = await docRef.get();
    const userData = userDoc.data();

    // Generate token
    const token = generateToken(docRef.id, roleName); // Uses string ID

    res.status(201).json({ 
        message: 'Utilisateur créé avec succès.',
        token,
        user: { id: docRef.id, ...userData }
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
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('username', '==', username).get();
    
    if (snapshot.empty) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    // Vérifier le mot de passe (Comparaison directe, sans hachage)
    const isPasswordValid = (password === user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const userRole = user.role || 'user';

    // Générer le token
    const token = generateToken(userDoc.id, userRole);

    res.json({
        message: 'Connexion réussie.',
        token,
        user: { 
            id: userDoc.id, 
            username: user.username, 
            role: userRole 
        }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
};
