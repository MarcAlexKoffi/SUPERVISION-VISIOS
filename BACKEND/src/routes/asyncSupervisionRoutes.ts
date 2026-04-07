import { Router } from 'express';
import { 
  createAsyncSupervision, 
  getAsyncSupervisions, 
  getAsyncSupervisionById, 
  updateAsyncSupervision, 
  deleteAsyncSupervision 
} from '../controllers/asyncSupervisionController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticateToken, createAsyncSupervision);
router.get('/', authenticateToken, getAsyncSupervisions);
router.get('/:id', authenticateToken, getAsyncSupervisionById);
router.put('/:id', authenticateToken, updateAsyncSupervision);
router.delete('/:id', authenticateToken, deleteAsyncSupervision);

export default router;
