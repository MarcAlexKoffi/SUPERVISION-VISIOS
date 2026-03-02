import { Router } from 'express';
import { getParcours, createParcours, deleteParcours } from '../controllers/parcoursController';

const router = Router();

router.get('/', getParcours);
router.post('/', createParcours);
router.delete('/:id', deleteParcours);

export default router;
