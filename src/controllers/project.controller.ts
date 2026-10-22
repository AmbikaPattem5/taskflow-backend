import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
  const { projects, pagination } = await ProjectService.getProjects(
    req.user!.id,
    req.user!.role,
    req.query as any
  );
  sendSuccess(res, projects, 'Projects retrieved successfully', 200, pagination);
});

export const getProjectById = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectService.getProjectById(
    req.params.id,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, project, 'Project details retrieved successfully', 200);
});

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectService.createProject(req.user!.id, req.body);
  sendSuccess(res, project, 'Project created successfully', 201);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await ProjectService.updateProject(
    req.params.id,
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, project, 'Project updated successfully', 200);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  await ProjectService.deleteProject(req.params.id, req.user!.id, req.user!.role);
  sendSuccess(res, null, 'Project deleted successfully', 200);
});
