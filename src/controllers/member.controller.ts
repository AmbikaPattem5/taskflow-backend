import { Request, Response } from 'express';
import { MemberService } from '../services/member.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

/**
 * GET /api/members
 * List team members visible to the authenticated user.
 */
export const getMembers = asyncHandler(async (req: Request, res: Response) => {
  const { members, pagination } = await MemberService.getMembers(
    req.user!.id,
    req.user!.role,
    req.query as any
  );
  sendSuccess(res, members, 'Team members retrieved successfully', 200, pagination);
});

/**
 * POST /api/members
 * Add / Invite a new member directly to the system/workspace without requiring a project.
 */
export const addSystemMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await MemberService.addSystemMember(
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, member, 'Member added to system successfully', 201);
});

/**
 * GET /api/members/:userId
 * Retrieve profile details of a single member within authorized scope.
 */
export const getMemberProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await MemberService.getMemberProfile(
    req.params.userId,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, profile, 'Member profile retrieved successfully', 200);
});

/**
 * GET /api/projects/:projectId/members
 * List members belonging to a project.
 */
export const getProjectMembers = asyncHandler(async (req: Request, res: Response) => {
  const result = await MemberService.getProjectMembers(
    req.params.projectId,
    req.user!.id,
    req.user!.role,
    req.query as any
  );

  if (Array.isArray(result)) {
    sendSuccess(res, result, 'Project members retrieved successfully', 200);
  } else {
    sendSuccess(res, result.members, 'Project members retrieved successfully', 200, result.pagination);
  }
});

/**
 * POST /api/projects/:projectId/members
 * Add a member to a project.
 */
export const addProjectMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await MemberService.addProjectMember(
    req.params.projectId,
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, member, 'Member added to project successfully', 201);
});

/**
 * PATCH /api/projects/:projectId/members/:userId
 * or PATCH /api/members/:userId (with projectId in body or query)
 * Update member role.
 */
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const projectId = req.params.projectId || req.body.projectId || (req.query.projectId as string);
  if (!projectId) {
    throw new AppError('Project ID is required to update a member role', 400);
  }

  const member = await MemberService.updateMemberRole(
    projectId,
    req.params.userId,
    req.user!.id,
    req.user!.role,
    req.body.role
  );
  sendSuccess(res, member, 'Member role updated successfully', 200);
});

/**
 * DELETE /api/projects/:projectId/members/:userId
 * Remove a member from a project.
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  await MemberService.removeMember(
    req.params.projectId,
    req.params.userId,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, null, 'Member removed from project successfully', 200);
});

/**
 * PATCH /api/members/:userId
 * Update member details (name, role, status).
 */
export const updateMember = asyncHandler(async (req: Request, res: Response) => {
  const member = await MemberService.updateSystemMember(
    req.params.userId,
    req.user!.id,
    req.user!.role,
    req.body
  );
  sendSuccess(res, member, 'Member updated successfully', 200);
});

/**
 * PATCH /api/members/:userId/status
 * Activate or deactivate a member.
 */
export const updateMemberStatus = asyncHandler(async (req: Request, res: Response) => {
  const member = await MemberService.updateMemberStatus(
    req.params.userId,
    req.user!.id,
    req.user!.role,
    req.body.status
  );
  sendSuccess(res, member, `Member status updated to ${req.body.status}`, 200);
});

/**
 * DELETE /api/members/:userId
 * Delete a member completely from the system and all projects.
 */
export const deleteSystemMember = asyncHandler(async (req: Request, res: Response) => {
  const result = await MemberService.deleteSystemMember(
    req.params.userId,
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, result, 'Member deleted from the system successfully', 200);
});

