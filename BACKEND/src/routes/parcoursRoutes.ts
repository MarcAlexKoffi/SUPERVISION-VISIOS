import { Router } from 'express';
import { getParcours, createParcours, deleteParcours, updateParcours } from '../controllers/parcoursController';

const router = Router();

router.get('/', getParcours);
router.post('/', createParcours);
router.put('/:id', updateParcours);
router.delete('/:id', deleteParcours);

export default router;
