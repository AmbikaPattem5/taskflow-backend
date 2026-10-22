import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
} from '../controllers/project.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createProjectSchema, updateProjectSchema } from '../schemas/project.schema';
import { projectMemberRouter } from './member.routes';
import { projectTaskRouter } from './task.routes';

const router = Router();

router.use(authenticate);

router.get('/', getProjects);
router.post('/', validate(createProjectSchema, 'body'), createProject);
router.get('/:id', getProjectById);
router.patch('/:id', validate(updateProjectSchema, 'body'), updateProject);
router.delete('/:id', deleteProject);

// Nested routes
router.use('/:projectId/members', projectMemberRouter);
router.use('/:projectId/tasks', projectTaskRouter);

export default router;
