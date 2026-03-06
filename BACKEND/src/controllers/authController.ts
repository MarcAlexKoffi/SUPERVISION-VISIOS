// src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { db, admin } from '../config/db';
import { generateToken } from '../utils/token';

// interface User removed as no longer needed for MySQL typing

export const register = async (req: Request, res: Response) => {
  const { username, password, email, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    const usersRef = db.collection('users');
    
    // Vérification existence (username)
    const existingUserUsername = await usersRef.where('username', '==', username).get();
    if (!existingUserUsername.empty) {
      return res.status(409).json({ message: 'Ce nom d\'utilisateur existe déjà.' });
    }

    // Vérification existence (email si fourni)
    if (email) {
        const existingUserEmail = await usersRef.where('email', '==', email).get();
        if (!existingUserEmail.empty) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
        }
    }

    const roleName = role || 'user';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = {
      username,
      password: passwordHash,
      email: email || null,
      role: roleName,
      created_at: new Date()
    };

    const docRef = await usersRef.add(newUser);
    const userDoc = await docRef.get();
    const userData = userDoc.data();

    // Generate token
    const token = generateToken(docRef.id, roleName); 

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
  const { username, password } = req.body; // 'username' contient l'input de login (email ou username)

  if (!username || !password) {
    return res.status(400).json({ message: 'Nom d\'utilisateur et mot de passe requis.' });
  }

  try {
    const usersRef = db.collection('users');
    
    // Recherche par username OU email
    const snapshot = await usersRef.where(
        admin.firestore.Filter.or(
            admin.firestore.Filter.where('username', '==', username),
            admin.firestore.Filter.where('email', '==', username)
        )
    ).get();
    
    if (snapshot.empty) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();

    if (!user.password) {
         return res.status(401).json({ message: 'Identifiants incorrects (compte invalide).' });
    }

    // Vérifier le mot de passe
    let isPasswordValid = false;

    // 1. Essayer comme hash bcrypt
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
        isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
        // 2. Fallback: Comparaison texte brut
        isPasswordValid = (password === user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const userRole = user.role || 'user';

    const token = generateToken(userDoc.id, userRole);

    res.json({
        message: 'Connexion réussie.',
        token,
        user: { 
            id: userDoc.id, 
            username: user.username, 
            email: user.email,
            role: userRole 
        }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
};
