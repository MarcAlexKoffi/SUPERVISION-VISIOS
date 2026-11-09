import { Router } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';
import { getParcours, createParcours, deleteParcours, updateParcours } from '../controllers/parcoursController';

const router = Router();

router.get('/', getParcours);
router.post('/', authenticateToken, requireAdmin, createParcours);
router.put('/:id', authenticateToken, requireAdmin, updateParcours);
router.delete('/:id', authenticateToken, requireAdmin, deleteParcours);

export default router;
