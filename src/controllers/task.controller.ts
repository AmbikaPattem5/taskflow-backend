import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getProjectTasks = asyncHandler(async (req: Request, res: Response) => {
  const { tasks, pagination } = await TaskService.getProjectTasks(
    req.params.projectId,
    req.user!.id,
    req.user!.role,
    req.query as any
  );
  sendSuccess(res, tasks, 'Tasks retrieved successfully', 200, pagination);
});

export const getTaskById = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.getTaskById(
    req.params.id,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, task, 'Task details retrieved successfully', 200);
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.createTask(
    req.params.projectId,
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, task, 'Task created successfully', 201);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await TaskService.updateTask(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, task, 'Task updated successfully', 200);
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  await TaskService.deleteTask(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, null, 'Task deleted successfully', 200);
});
