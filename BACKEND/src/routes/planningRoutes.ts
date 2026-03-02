import { Router } from 'express';
import { 
  createPlanning, 
  getPlannings, 
  updatePlanning, 
  deletePlanning 
} from '../controllers/planningController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

// Routes protégées par l'authentification
router.use(authenticateToken);

router.post('/', createPlanning);
router.get('/', getPlannings);
router.put('/:id', updatePlanning);
router.delete('/:id', deletePlanning);

export default router;
