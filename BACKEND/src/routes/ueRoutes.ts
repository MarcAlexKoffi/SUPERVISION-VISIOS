
import express from 'express';
import { getAllUEs, createUE, updateUE, deleteUE } from '../controllers/ueController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Tout utilisateur connecté peut voir, créer, modifier et supprimer des UE
// "Comme l'administrateur" signifie full access sur cette ressource
router.get('/', authenticateToken, getAllUEs);
router.post('/', authenticateToken, createUE);
router.put('/:id', authenticateToken, updateUE);
router.delete('/:id', authenticateToken, deleteUE);

export default router;
