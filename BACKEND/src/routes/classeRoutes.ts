import { Router } from 'express';
import { getClasses, createClasse, deleteClasse, updateClasse } from '../controllers/classeController';

const router = Router();

router.get('/', getClasses);
router.post('/', createClasse);
router.put('/:id', updateClasse);
router.delete('/:id', deleteClasse);

export default router;
