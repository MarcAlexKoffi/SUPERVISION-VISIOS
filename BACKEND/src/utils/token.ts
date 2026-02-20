// src/utils/token.ts
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

export const generateToken = (userId: number, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '8h' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, JWT_SECRET);
};
