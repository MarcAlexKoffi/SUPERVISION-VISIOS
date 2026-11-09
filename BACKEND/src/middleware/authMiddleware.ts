import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';
import { admin, db } from '../config/db';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
  }

  try {
    // Legacy custom JWT: never trust its embedded role, which can be stale.
    const payload = verifyToken(token);
    if (typeof payload === 'string' || !payload.id || !['string', 'number'].includes(typeof payload.id)) {
      throw new Error('Invalid legacy token payload');
    }
    const userId = String(payload.id);
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error('Legacy JWT user no longer exists');
    }
    const role = userDoc.data()?.role;
    req.user = { id: userId, role: typeof role === 'string' ? role : 'user' };
    return next();
  } catch (err) {
    // 2. If custom JWT fails, try verifying as a Firebase ID Token
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Fetch role from Firestore because requireAdmin needs it
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      const role = userDoc.exists ? (userDoc.data()?.role || 'user') : 'user';
      
      req.user = { id: decodedToken.uid, ...decodedToken, role };
      return next();
    } catch (firebaseErr) {
      console.error('Token verification failed:', firebaseErr);
      return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // console.log('User Role:', req.user?.role); // Debug
  if (!req.user || typeof req.user.role !== 'string' || req.user.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
  }
  next();
};
