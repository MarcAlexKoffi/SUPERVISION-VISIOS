import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { getClasses, createClasse, deleteClasse, updateClasse } from '../controllers/classeController';

const router = Router();

router.get('/', getClasses);
router.post('/', authenticateToken, requireAdmin, createClasse);
router.put('/:id', authenticateToken, requireAdmin, updateClasse);
router.delete('/:id', authenticateToken, requireAdmin, deleteClasse);

export default router;
