// src/routes/teacherRoutes.ts
import { Router } from 'express';
import { getAllTeachers, getTeacherById, createTeacher, updateTeacher, deleteTeacher } from '../controllers/teacherController';
import { authenticateToken, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticateToken, getAllTeachers);
router.get('/:id', authenticateToken, getTeacherById);
router.post('/', authenticateToken, requireAdmin, createTeacher);
router.put('/:id', authenticateToken, requireAdmin, updateTeacher);
router.delete('/:id', authenticateToken, requireAdmin, deleteTeacher);

export default router;
