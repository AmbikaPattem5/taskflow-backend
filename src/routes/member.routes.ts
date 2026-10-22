import { Router } from 'express';
import {
  getMembers,
  addSystemMember,
  getMemberProfile,
  updateMember,
  updateMemberStatus,
  deleteSystemMember,
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeMember,
} from '../controllers/member.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  addMemberSchema,
  updateMemberRoleSchema,
  memberQuerySchema,
  createSystemMemberSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
} from '../schemas/member.schema';

// Project-scoped nested member router: /api/projects/:projectId/members
export const projectMemberRouter = Router({ mergeParams: true });

projectMemberRouter.use(authenticate);
projectMemberRouter.get('/', validate(memberQuerySchema, 'query'), getProjectMembers);
projectMemberRouter.post('/', validate(addMemberSchema, 'body'), addProjectMember);
projectMemberRouter.patch('/:userId', validate(updateMemberRoleSchema, 'body'), updateMemberRole);
projectMemberRouter.delete('/:userId', removeMember);

// Workspace/Team-scoped member router: /api/members
const teamMemberRouter = Router();

teamMemberRouter.use(authenticate);
teamMemberRouter.get('/', validate(memberQuerySchema, 'query'), getMembers);
teamMemberRouter.post('/', validate(createSystemMemberSchema, 'body'), addSystemMember);
teamMemberRouter.get('/:userId', getMemberProfile);
teamMemberRouter.patch('/:userId', validate(updateMemberSchema, 'body'), updateMember);
teamMemberRouter.patch('/:userId/status', validate(updateMemberStatusSchema, 'body'), updateMemberStatus);
teamMemberRouter.delete('/:userId', deleteSystemMember);

export default teamMemberRouter;
