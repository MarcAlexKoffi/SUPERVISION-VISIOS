import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Accès non autorisé. Token manquant.' });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token invalide ou expiré.' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  // console.log('User Role:', req.user?.role); // Debug
  if (!req.user || req.user.role.toLowerCase() !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
  }
  next();
};
