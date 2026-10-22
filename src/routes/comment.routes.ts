import { Router } from 'express';
import {
  getTaskComments,
  createComment,
  updateComment,
  deleteComment,
} from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { createCommentSchema, updateCommentSchema } from '../schemas/comment.schema';

// Router for /api/comments/:id
export const commentRouter = Router();
commentRouter.use(authenticate);
commentRouter.patch('/:id', validate(updateCommentSchema, 'body'), updateComment);
commentRouter.delete('/:id', deleteComment);

// Router for /api/tasks/:taskId/comments
export const taskCommentRouter = Router({ mergeParams: true });
taskCommentRouter.use(authenticate);
taskCommentRouter.get('/', getTaskComments);
taskCommentRouter.post('/', validate(createCommentSchema, 'body'), createComment);
