
import express from 'express';
import { getAllUEs, createUE, updateUE, deleteUE } from '../controllers/ueController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

router.get('/', authenticateToken, getAllUEs);
router.post('/', authenticateToken, requireAdmin, createUE);
router.put('/:id', authenticateToken, requireAdmin, updateUE);
router.delete('/:id', authenticateToken, requireAdmin, deleteUE);

export default router;
