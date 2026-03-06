import { Request, Response } from 'express';
import { db } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

export const listUsers = async (req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data['username'],
        email: data['email'],
        role: data['role'], // Assuming 'role' string field
        created_at: data['created_at'] ? data['created_at'].toDate() : null
      };
    });
    res.json(users);
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
    const usersRef = db.collection('users');
    const existing = await usersRef.where('username', '==', username).get();
    
    if (!existing.empty) {
        return res.status(409).json({ message: 'Utilisateur existant.' });
    }
    
    // Check email uniqueness if provided
    if (email) {
       const existingEmail = await usersRef.where('email', '==', email).get();
       if (!existingEmail.empty) {
         return res.status(409).json({ message: 'Cet email est déjà utilisé.' });
       }
    }

    // Insert
    const newUser = {
      username,
      password, // Plain text
      email: email || null,
      role: roleName,
      created_at: new Date()
    };
    
    const docRef = await usersRef.add(newUser);

    res.status(201).json({ 
        message: 'Utilisateur créé.', 
        user: { id: docRef.id, username, email, role: roleName } 
    });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur.', error: error.message });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const { username, password, email, role } = req.body;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    // Build update object
    const updates: any = {};
    if (username) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (role) updates.role = role;
    if (password) updates.password = password;

    if (Object.keys(updates).length > 0) {
        // Check uniqueness if changing username or email
        // This is complex in Firestore (need transactions or separate reads), skipping for brevity but recommended.
        await userRef.update(updates);
    }

    res.json({ message: 'Utilisateur mis à jour avec succès.' });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }

    await userRef.delete();

    res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la suppression.' });
  }
};
