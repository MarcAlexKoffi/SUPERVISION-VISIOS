import { Response } from 'express';
import { db, auth } from '../config/db';
import { AuthRequest } from '../middleware/authMiddleware';

// All user provisioning and role changes must go through this admin-only API.
// Never accept a role from a non-administrator or persist a password in Firestore.
const ALLOWED_ROLES = new Set(['admin', 'assistant', 'superviseur', 'enseignant', 'user', 'etudiant']);

function validRole(role: unknown): role is string {
  return typeof role === 'string' && ALLOWED_ROLES.has(role.trim().toLowerCase());
}

function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function authErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return '';
}

export const listUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data['username'],
        email: data['email'],
        role: data['role'],
        created_at: data['created_at']?.toDate?.() || null
      };
    });
    res.json(users);
  } catch (error) {
    console.error('listUsers failed', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs.' });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  const { username, password, email, role } = req.body || {};
  const name = typeof username === 'string' ? username.trim() : '';
  const emailAddress = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const roleName = typeof role === 'string' ? role.trim().toLowerCase() : 'enseignant';

  if (!name || !isEmail(emailAddress) || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ message: 'Nom, adresse e-mail valide et mot de passe de 6 caractères minimum requis.' });
  }
  if (!validRole(roleName)) {
    return res.status(400).json({ message: 'Rôle invalide.' });
  }

  try {
    const usersRef = db.collection('users');
    if (!(await usersRef.where('username', '==', name).limit(1).get()).empty) {
      return res.status(409).json({ message: 'Nom d’utilisateur déjà utilisé.' });
    }
    if (!(await usersRef.where('email', '==', emailAddress).limit(1).get()).empty) {
      return res.status(409).json({ message: 'Adresse e-mail déjà utilisée.' });
    }

    // Identity is created first, then the matching Firestore document.
    // A failed profile write is compensated by deleting the new Auth user.
    const account = await auth.createUser({ email: emailAddress, password, displayName: name });
    const userData = { username: name, email: emailAddress, role: roleName, created_at: new Date() };
    try {
      await usersRef.doc(account.uid).create(userData);
    } catch (profileError) {
      try {
        await auth.deleteUser(account.uid);
      } catch (rollbackError) {
        console.error('CRITICAL: Auth account cleanup failed after profile creation error', account.uid, rollbackError);
      }
      throw profileError;
    }

    return res.status(201).json({
      message: 'Utilisateur créé.',
      user: { id: account.uid, ...userData }
    });
  } catch (error) {
    if (authErrorCode(error) === 'auth/email-already-exists') {
      return res.status(409).json({ message: 'Adresse e-mail déjà utilisée.' });
    }
    if (authErrorCode(error) === 'auth/invalid-password' || authErrorCode(error) === 'auth/invalid-email') {
      return res.status(400).json({ message: 'Adresse e-mail ou mot de passe invalide.' });
    }
    console.error('createUser failed', error);
    return res.status(500).json({ message: 'Erreur lors de la création du compte. Aucune confirmation de création.' });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  const { username, password, email, role } = req.body || {};

  if (role !== undefined && !validRole(role)) {
    return res.status(400).json({ message: 'Rôle invalide.' });
  }
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : undefined;
  if (req.user?.id === userId && normalizedRole && normalizedRole !== 'admin') {
    return res.status(409).json({ message: 'Vous ne pouvez pas supprimer votre propre rôle administrateur.' });
  }
  if (username !== undefined && (typeof username !== 'string' || !username.trim())) {
    return res.status(400).json({ message: 'Nom d’utilisateur invalide.' });
  }
  if (email !== undefined && !isEmail(email)) {
    return res.status(400).json({ message: 'Adresse e-mail invalide.' });
  }
  if (password !== undefined && password !== '' && (typeof password !== 'string' || password.length < 6)) {
    return res.status(400).json({ message: 'Mot de passe trop court.' });
  }

  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'Utilisateur non trouvé.' });
    }
    const before = userDoc.data() || {};
    const updates: Record<string, unknown> = {};
    const authUpdates: { email?: string; displayName?: string; password?: string } = {};
    if (username !== undefined) {
      updates.username = username.trim();
      authUpdates.displayName = username.trim();
    }
    if (email !== undefined) {
      const cleanEmail = email.trim().toLowerCase();
      updates.email = cleanEmail;
      authUpdates.email = cleanEmail;
    }
    if (normalizedRole) updates.role = normalizedRole;
    if (password) authUpdates.password = password;

    // Legacy records created before Firebase Auth provisioning might lack
    // a matching UID. Permit metadata-only changes; do not claim to update
    // passwords for a non-existent Auth account.
    let authAccountExists = false;
    if (Object.keys(authUpdates).length) {
      try {
        await auth.getUser(userId);
        authAccountExists = true;
      } catch (error) {
        if (authErrorCode(error) !== 'auth/user-not-found') throw error;
        if (password) {
          return res.status(409).json({ message: 'Compte historique sans identité Firebase Auth. Migration requise pour changer le mot de passe.' });
        }
      }
    }

    if (Object.keys(updates).length) await userRef.update(updates);
    if (authAccountExists) {
      try {
        await auth.updateUser(userId, authUpdates);
      } catch (error) {
        // Compensate only fields modified by this request. A previous
        // concurrent edit must not be silently treated as a successful write.
        try {
          const rollback: Record<string, unknown> = {};
          for (const key of Object.keys(updates)) {
            if (before[key] !== undefined) rollback[key] = before[key];
          }
          if (Object.keys(rollback).length) await userRef.update(rollback);
        } catch (rollbackError) {
          console.error('CRITICAL: updateUser profile rollback failed', userId, rollbackError);
        }
        if (authErrorCode(error) === 'auth/email-already-exists') {
          return res.status(409).json({ message: 'Adresse e-mail déjà utilisée.' });
        }
        console.error('updateUser Firebase Auth update failed', userId, error);
        return res.status(500).json({ message: 'Échec de mise à jour des identifiants Firebase Auth.' });
      }
    }
    return res.json({ message: 'Utilisateur mis à jour avec succès.' });
  } catch (error) {
    console.error('updateUser failed', error);
    return res.status(500).json({ message: 'Erreur lors de la mise à jour.' });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  const userId = req.params.id;
  if (req.user?.id === userId) {
    return res.status(409).json({ message: 'Un administrateur ne peut pas supprimer son propre compte.' });
  }
  try {
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ message: 'Utilisateur non trouvé.' });

    try {
      await auth.deleteUser(userId);
    } catch (error) {
      if (authErrorCode(error) !== 'auth/user-not-found') throw error;
      // Historical Firestore-only account: profile cleanup remains supported.
    }
    await userRef.delete();
    return res.json({ message: 'Utilisateur supprimé.' });
  } catch (error) {
    console.error('deleteUser failed', userId, error);
    return res.status(500).json({ message: 'Erreur lors de la suppression du compte.' });
  }
};
