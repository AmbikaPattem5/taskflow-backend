import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import projectRoutes from './project.routes';
import { taskRouter } from './task.routes';
import { commentRouter } from './comment.routes';
import notificationRoutes from './notification.routes';
import dashboardRoutes from './dashboard.routes';
import memberRoutes from './member.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/members', memberRoutes);
router.use('/tasks', taskRouter);
router.use('/comments', commentRouter);
router.use('/notifications', notificationRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
