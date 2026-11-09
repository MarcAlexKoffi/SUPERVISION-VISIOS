// Backend-only legacy JWT support. Firebase ID tokens are verified in authMiddleware.
import jwt, { JwtPayload } from 'jsonwebtoken';

// Read at call-time: dotenv may be initialized after modules were imported.
// Never sign/verify a legacy JWT using a publicly known fallback secret.
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret === 'your_super_secret_key' || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too weak: legacy JWT is disabled.');
  }
  return secret;
};

export const generateToken = (userId: number | string, role: string) => {
  return jwt.sign({ id: userId, role }, getJwtSecret(), { expiresIn: '8h' });
};

export const verifyToken = (token: string): string | JwtPayload => {
  return jwt.verify(token, getJwtSecret());
};
