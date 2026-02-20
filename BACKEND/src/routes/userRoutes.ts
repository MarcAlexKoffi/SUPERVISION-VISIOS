import express from 'express';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken); // All routes require authentication
router.use(requireAdmin); // All routes require admin role

// Routes
router.get('/', listUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
