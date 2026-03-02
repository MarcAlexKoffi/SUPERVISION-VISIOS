import { Router } from 'express';
import { getClasses, createClasse, deleteClasse } from '../controllers/classeController';

const router = Router();

router.get('/', getClasses);
router.post('/', createClasse);
router.delete('/:id', deleteClasse);

export default router;
