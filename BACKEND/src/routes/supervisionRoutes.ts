
import express from 'express';
import { 
  createSupervision, 
  getAllSupervisions, 
  getSupervisionById, 
  deleteSupervision,
  updateSupervision
} from '../controllers/supervisionController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Toutes les routes nécessitent d'être identifié
router.use(authenticateToken);

router.post('/', createSupervision);
router.get('/', getAllSupervisions);
router.get('/:id', getSupervisionById);
router.put('/:id', updateSupervision); // Add PUT route

// Seul un administrateur peut supprimer une fiche (à adapter selon vos règles métier)
router.delete('/:id', requireAdmin, deleteSupervision);

export default router;
