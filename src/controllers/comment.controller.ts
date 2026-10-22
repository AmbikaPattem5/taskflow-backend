import { Request, Response } from 'express';
import { CommentService } from '../services/comment.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getTaskComments = asyncHandler(async (req: Request, res: Response) => {
  const comments = await CommentService.getTaskComments(
    req.params.taskId,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, comments, 'Comments retrieved successfully', 200);
});

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await CommentService.createComment(
    req.params.taskId,
    req.user!.id,
    req.user!.role,
    req.body.content
  );
  sendSuccess(res, comment, 'Comment added successfully', 201);
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await CommentService.updateComment(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body.content
  );
  sendSuccess(res, comment, 'Comment updated successfully', 200);
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  await CommentService.deleteComment(
    req.params.id,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, null, 'Comment deleted successfully', 200);
});
