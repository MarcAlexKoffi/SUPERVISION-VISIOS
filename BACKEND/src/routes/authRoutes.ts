// src/routes/authRoutes.ts
import express from 'express';
import { register, login } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Account provisioning is restricted to a verified administrator.
router.post('/register', authenticateToken, requireAdmin, register);
router.post('/login', login);

export default router;
