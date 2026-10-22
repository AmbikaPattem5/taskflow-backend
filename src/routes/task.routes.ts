import { Router } from 'express';
import {
  getProjectTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/task.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createTaskSchema, updateTaskSchema } from '../schemas/task.schema';
import { taskCommentRouter } from './comment.routes';

// Router for /api/tasks
export const taskRouter = Router();
taskRouter.use(authenticate);
taskRouter.get('/:id', getTaskById);
taskRouter.patch('/:id', validate(updateTaskSchema, 'body'), updateTask);
taskRouter.delete('/:id', deleteTask);
taskRouter.use('/:taskId/comments', taskCommentRouter);

// Router for /api/projects/:projectId/tasks
export const projectTaskRouter = Router({ mergeParams: true });
projectTaskRouter.use(authenticate);
projectTaskRouter.get('/', getProjectTasks);
projectTaskRouter.post('/', validate(createTaskSchema, 'body'), createTask);
