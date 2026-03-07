
import express from 'express';
import { 
  createSupervision, 
  getAllSupervisions, 
  getSupervisionById, 
  deleteSupervision, 
  updateSupervision,
  sendSupervisionReport 
} from '../controllers/supervisionController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Middleware de log pour ce routeur
router.use((req, res, next) => {
    console.log(`[SupervisionRouter] ${req.method} ${req.path}`);
    next();
});

// Toutes les routes nécessitent d'être identifié
router.use(authenticateToken);

router.post('/', createSupervision);
router.get('/', getAllSupervisions);
router.get('/:id', getSupervisionById);
router.put('/:id', updateSupervision);

// Route spécifique AVANT les routes génériques paramétrées si nécessaire,
// mais ici :id/send-report est assez spécifique.
router.post('/:id/send-report', (req, res, next) => {
    console.log(`[SupervisionRouter] Envoi de rapport demandé pour ID: ${req.params.id}`);
    next();
}, sendSupervisionReport);

// Seul un administrateur peut supprimer une fiche (à adapter selon vos règles métier)
router.delete('/:id', requireAdmin, deleteSupervision);

export default router;
