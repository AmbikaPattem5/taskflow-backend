import mongoose from 'mongoose';
import { ProjectMember } from '../models/projectMember.model';
import { Project } from '../models/project.model';
import { User } from '../models/user.model';
import { ProjectService } from './project.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import {
  AddMemberInput,
  MemberQueryInput,
  CreateSystemMemberInput,
  UpdateMemberInput,
  UpdateMemberStatusInput,
} from '../schemas/member.schema';
import { PaginationMeta, UserRole } from '../types';

export class MemberService {
  /**
   * List team members visible to the authenticated user.
   * Scoped to projects the user is authorized to access (or all projects if system ADMIN).
   */
  public static async getMembers(
    currentUserId: string,
    currentUserRole: UserRole,
    query: MemberQueryInput
  ): Promise<{ members: any[]; pagination: PaginationMeta }> {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      status,
      sortBy = 'joinedAt',
      sortOrder = 'asc',
      projectId,
    } = query;

    let permittedProjectIds: string[] = [];

    if (currentUserRole === 'ADMIN') {
      if (projectId) {
        const project = await Project.findById(projectId);
        if (!project) {
          throw new AppError('Project not found', 404);
        }
        permittedProjectIds = [projectId];
      }
    } else {
      const ownedProjects = await Project.find({ ownerId: currentUserId }).select('_id');
      const memberships = await ProjectMember.find({ userId: currentUserId }).select('projectId');
      const userProjectIds = [
        ...ownedProjects.map((p) => p._id.toString()),
        ...memberships.map((m) => m.projectId.toString()),
      ];

      if (projectId) {
        if (!userProjectIds.includes(projectId)) {
          throw new AppError('You do not have permission to access this project', 403);
        }
        permittedProjectIds = [projectId];
      } else {
        permittedProjectIds = userProjectIds;
      }
    }

    let permittedUserIds: string[] = [];
    if (currentUserRole !== 'ADMIN' || projectId) {
      if (permittedProjectIds.length === 0) {
        permittedUserIds = [currentUserId];
      } else {
        const [projectMembers, projects] = await Promise.all([
          ProjectMember.find({ projectId: { $in: permittedProjectIds } }).select('userId'),
          Project.find({ _id: { $in: permittedProjectIds } }).select('ownerId'),
        ]);

        const ids = new Set<string>();
        ids.add(currentUserId);
        projectMembers.forEach((pm) => ids.add(pm.userId.toString()));
        projects.forEach((p) => ids.add(p.ownerId.toString()));
        permittedUserIds = Array.from(ids);
      }
    }

    const userFilter: any = {};
    if (currentUserRole !== 'ADMIN' || projectId) {
      userFilter._id = { $in: permittedUserIds };
    }

    if (role) {
      userFilter.role = role;
    }

    if (status) {
      userFilter.status = status;
    }

    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    if (sortBy === 'joinedAt' || sortBy === 'createdAt') {
      sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select('id name email avatar role status createdAt')
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(userFilter),
    ]);

    const userIds = users.map((u) => u._id);
    const membershipFilter: any = { userId: { $in: userIds } };
    if (currentUserRole !== 'ADMIN' || projectId) {
      membershipFilter.projectId = { $in: permittedProjectIds };
    }

    const projectMemberships = await ProjectMember.find(membershipFilter)
      .populate('projectId', 'id name')
      .lean();

    const members = users.map((u: any) => {
      const userMemberships = projectMemberships.filter(
        (m: any) => m.userId.toString() === u._id.toString()
      );

      const earliestJoinedAt = userMemberships.reduce((earliest: Date | null, m: any) => {
        if (!earliest || m.joinedAt < earliest) return m.joinedAt;
        return earliest;
      }, null);

      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: projectId && userMemberships.length > 0 ? userMemberships[0].role : u.role,
        status: u.status || 'ACTIVE',
        avatar: u.avatar,
        joinedAt: earliestJoinedAt || u.createdAt,
        projects: userMemberships.map((m: any) => ({
          id: m.projectId?._id?.toString() || m.projectId?.id || m.projectId?.toString(),
          name: m.projectId?.name || 'Unknown Project',
          role: m.role,
        })),
      };
    });

    const totalPages = Math.ceil(total / limit);
    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return { members, pagination };
  }

  /**
   * Retrieve single member profile by userId.
   * Ensures the member is within the authenticated user's authorized scope.
   */
  public static async getMemberProfile(
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError('Invalid user ID', 400);
    }

    const targetUser = await User.findById(targetUserId)
      .select('id name email avatar role status createdAt')
      .lean();

    if (!targetUser) {
      throw new AppError('Member not found', 404);
    }

    let permittedMemberships: any[] = [];

    if (currentUserRole === 'ADMIN') {
      permittedMemberships = await ProjectMember.find({ userId: targetUserId })
        .populate('projectId', 'id name')
        .lean();
    } else if (currentUserId === targetUserId) {
      permittedMemberships = await ProjectMember.find({ userId: targetUserId })
        .populate('projectId', 'id name')
        .lean();
    } else {
      const [myMemberships, myOwnedProjects] = await Promise.all([
        ProjectMember.find({ userId: currentUserId }).distinct('projectId'),
        Project.find({ ownerId: currentUserId }).distinct('_id'),
      ]);

      const sharedProjectIds = [...myMemberships, ...myOwnedProjects].map((id) => id.toString());

      const [targetMemberships, targetOwnedProjects] = await Promise.all([
        ProjectMember.find({
          userId: targetUserId,
          projectId: { $in: sharedProjectIds },
        })
          .populate('projectId', 'id name')
          .lean(),
        Project.find({
          ownerId: targetUserId,
          _id: { $in: sharedProjectIds },
        }).lean(),
      ]);

      if (targetMemberships.length === 0 && targetOwnedProjects.length === 0) {
        throw new AppError('Member not found or outside permitted scope', 404);
      }

      permittedMemberships = targetMemberships;
    }

    const earliestJoinedAt = permittedMemberships.reduce((earliest: Date | null, m: any) => {
      if (!earliest || m.joinedAt < earliest) return m.joinedAt;
      return earliest;
    }, null);

    return {
      id: (targetUser as any)._id?.toString() || targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: (targetUser as any).status || 'ACTIVE',
      avatar: targetUser.avatar,
      joinedAt: earliestJoinedAt || targetUser.createdAt,
      projects: permittedMemberships.map((m: any) => ({
        id: m.projectId?._id?.toString() || m.projectId?.id || m.projectId?.toString(),
        name: m.projectId?.name || 'Unknown Project',
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    };
  }

  /**
   * Add / Invite a new member directly to the system/workspace without requiring a project.
   */
  public static async addSystemMember(
    currentUserId: string,
    currentUserRole: UserRole,
    input: CreateSystemMemberInput
  ): Promise<any> {
    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER') {
      throw new AppError('Only administrators or managers can add members to the system', 403);
    }

    if (input.role === 'ADMIN' && currentUserRole !== 'ADMIN') {
      throw new AppError('Only administrators can grant the ADMIN role', 403);
    }

    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      if (input.projectId) {
        return await this.addProjectMember(input.projectId, currentUserId, currentUserRole, {
          userId: existingUser.id,
          role: input.role,
        });
      }
      throw new AppError('A user with this email address is already registered in the system.', 409);
    }

    const defaultName =
      input.name ||
      input.email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

    const defaultPassword = input.password || 'TaskFlow123!';

    const newUser = await User.create({
      name: defaultName,
      email: input.email.toLowerCase(),
      role: input.role || 'MEMBER',
      password: defaultPassword,
    });

    if (input.projectId) {
      const project = await Project.findById(input.projectId);
      if (project) {
        await ProjectMember.create({
          projectId: project._id,
          userId: newUser._id,
          role: input.role || 'MEMBER',
        });
      }
    }

    return {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      joinedAt: newUser.createdAt,
      status: 'ACTIVE',
      temporaryPassword: input.password ? undefined : defaultPassword,
    };
  }

  /**
   * Update member details (name, role, status) directly on the system.
   * Enforces last administrator and privilege escalation safeguards.
   */
  public static async updateSystemMember(
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    input: UpdateMemberInput
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError('Invalid user ID', 400);
    }

    if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER' && currentUserId !== targetUserId) {
      throw new AppError('You do not have permission to update this member', 403);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('Member not found', 404);
    }

    // Role change rules
    if (input.role && input.role !== targetUser.role) {
      if (currentUserRole !== 'ADMIN') {
        throw new AppError('Only administrators can change account roles', 403);
      }

      // Last administrator protection
      if (targetUser.role === 'ADMIN' && input.role !== 'ADMIN') {
        const activeAdminCount = await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
        if (activeAdminCount <= 1) {
          throw new AppError('Cannot demote the last active administrator of the system', 400);
        }
      }

      targetUser.role = input.role;
    }

    // Status change rules (Active / Inactive)
    if (input.status && input.status !== targetUser.status) {
      if (currentUserRole !== 'ADMIN' && currentUserRole !== 'MANAGER') {
        throw new AppError('Only administrators or managers can update member status', 403);
      }

      // Safeguard: Cannot deactivate the last active administrator
      if (targetUser.role === 'ADMIN' && input.status === 'INACTIVE') {
        const activeAdminCount = await User.countDocuments({ role: 'ADMIN', status: 'ACTIVE' });
        if (activeAdminCount <= 1) {
          throw new AppError('Cannot deactivate the last active administrator of the system', 400);
        }
      }

      targetUser.status = input.status;
    }

    if (input.name) {
      targetUser.name = input.name;
    }

    // If projectId was provided and role was updated, synchronize project role
    if (input.projectId && input.role) {
      const projectMembership = await ProjectMember.findOne({
        projectId: input.projectId,
        userId: targetUserId,
      });
      if (projectMembership) {
        projectMembership.role = input.role;
        await projectMembership.save();
      }
    }

    await targetUser.save();

    return {
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      role: targetUser.role,
      status: targetUser.status,
      avatar: targetUser.avatar,
      updatedAt: targetUser.updatedAt,
    };
  }

  /**
   * Activate / Deactivate a member.
   */
  public static async updateMemberStatus(
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    status: 'ACTIVE' | 'INACTIVE'
  ): Promise<any> {
    return this.updateSystemMember(targetUserId, currentUserId, currentUserRole, { status });
  }

  /**
   * Delete / Remove a member completely from the system and all projects.
   * Enforces self-deletion and last-administrator protection.
   */
  public static async deleteSystemMember(
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new AppError('Invalid user ID', 400);
    }

    if (currentUserRole !== 'ADMIN') {
      throw new AppError('Only administrators can remove members from the system', 403);
    }

    if (targetUserId === currentUserId) {
      throw new AppError('Cannot delete your own account from the member list', 400);
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      throw new AppError('Member not found', 404);
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = await User.countDocuments({ role: 'ADMIN' });
      if (adminCount <= 1) {
        throw new AppError('Cannot delete the last administrator of the system', 400);
      }
    }

    // Remove from all project memberships
    await ProjectMember.deleteMany({ userId: targetUserId });

    // Remove user
    await User.findByIdAndDelete(targetUserId);

    return { id: targetUserId, email: targetUser.email };
  }

  /**
   * List members of a specific project (with optional search, role filter, and sorting).
   */
  public static async getProjectMembers(
    projectId: string,
    userId: string,
    userRole: UserRole,
    query?: MemberQueryInput
  ): Promise<any> {
    await ProjectService.checkProjectAccess(projectId, userId, userRole);

    const filter: any = { projectId };
    if (query?.role) {
      filter.role = query.role;
    }

    const sortOptions: any = {};
    if (query?.sortBy === 'name') {
      sortOptions.joinedAt = query.sortOrder === 'desc' ? -1 : 1;
    } else {
      sortOptions.joinedAt = query?.sortOrder === 'desc' ? -1 : 1;
    }

    const members = await ProjectMember.find(filter)
      .populate('userId', 'id name email avatar role')
      .sort(sortOptions)
      .lean();

    let formatted = members.map((m: any) => ({
      id: m._id.toString(),
      projectId: m.projectId.toString(),
      user: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
    }));

    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      formatted = formatted.filter(
        (m: any) =>
          m.user?.name?.toLowerCase().includes(searchLower) ||
          m.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    if (query?.page && query?.limit) {
      const page = query.page;
      const limit = query.limit;
      const total = formatted.length;
      const totalPages = Math.ceil(total / limit);
      const paginatedMembers = formatted.slice((page - 1) * limit, page * limit);

      const pagination: PaginationMeta = {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return { members: paginatedMembers, pagination };
    }

    return formatted;
  }

  /**
   * Add a member to a project.
   * Enforces privilege escalation prevention (only ADMIN/owner can assign ADMIN role).
   */
  public static async addProjectMember(
    projectId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    input: AddMemberInput
  ): Promise<any> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const isOwner = project.ownerId.toString() === currentUserId;
    const isSystemAdmin = currentUserRole === 'ADMIN';
    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: currentUserId,
    });
    const isProjectAdmin = requesterMembership?.role === 'ADMIN';
    const isProjectManager = requesterMembership?.role === 'MANAGER';

    if (!isOwner && !isSystemAdmin && !isProjectAdmin && !isProjectManager) {
      throw new AppError('Manager or owner permissions required for this action', 403);
    }

    if (input.role === 'ADMIN' && !isOwner && !isSystemAdmin && !isProjectAdmin) {
      throw new AppError(
        'Only project administrators or the project owner can add a member as ADMIN',
        403
      );
    }

    let targetUser;
    if (input.userId) {
      targetUser = await User.findById(input.userId);
    } else if (input.email) {
      targetUser = await User.findOne({ email: input.email.toLowerCase() });
    }

    if (!targetUser) {
      throw new AppError(
        'User not found. They must register first before being added to a project.',
        404
      );
    }

    const existingMembership = await ProjectMember.findOne({
      projectId,
      userId: targetUser._id,
    });

    if (existingMembership) {
      throw new AppError('User is already a member of this project.', 409);
    }

    const member = await ProjectMember.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      userId: targetUser._id,
      role: input.role || 'MEMBER',
    });

    await NotificationService.createNotification(
      targetUser.id,
      'PROJECT_INVITATION',
      `You were added to the project "${project.name}" as a ${input.role || 'MEMBER'}.`
    );

    await ActivityService.logActivity(projectId, currentUserId, 'MEMBER_ADDED', null, {
      memberId: targetUser.id,
      memberName: targetUser.name,
      role: input.role || 'MEMBER',
    });

    return {
      id: member.id,
      projectId,
      user: {
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        avatar: targetUser.avatar,
        role: targetUser.role,
      },
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  /**
   * Update member role in project.
   * Enforces server-side authorization and last-administrator protection.
   */
  public static async updateMemberRole(
    projectId: string,
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole,
    newRole: UserRole
  ): Promise<any> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const isOwner = project.ownerId.toString() === currentUserId;
    const isSystemAdmin = currentUserRole === 'ADMIN';
    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: currentUserId,
    });
    const isProjectAdmin = requesterMembership?.role === 'ADMIN';

    if (!isOwner && !isSystemAdmin && !isProjectAdmin) {
      throw new AppError(
        'Only project administrators or the project owner can change member roles',
        403
      );
    }

    const membership = await ProjectMember.findOne({ projectId, userId: targetUserId });
    if (!membership) {
      throw new AppError('Member not found in this project', 404);
    }

    if (project.ownerId.toString() === targetUserId && newRole !== 'ADMIN') {
      throw new AppError('Cannot change the role of the project owner', 400);
    }

    if (membership.role === 'ADMIN' && newRole !== 'ADMIN') {
      const adminCount = await ProjectMember.countDocuments({ projectId, role: 'ADMIN' });
      if (adminCount <= 1) {
        throw new AppError('Cannot demote the last administrator of the project', 400);
      }
    }

    membership.role = newRole;
    await membership.save();

    await ActivityService.logActivity(projectId, currentUserId, 'MEMBER_ROLE_UPDATED', null, {
      targetUserId,
      newRole,
    });

    await NotificationService.createNotification(
      targetUserId,
      'SYSTEM',
      `Your role in project "${project.name}" has been updated to ${newRole}.`
    );

    const targetUser = await User.findById(targetUserId).select('id name email avatar role');

    return {
      id: membership.id,
      projectId: membership.projectId.toString(),
      userId: targetUserId,
      role: membership.role,
      joinedAt: membership.joinedAt,
      user: targetUser,
      member: {
        userId: targetUserId,
        role: membership.role,
      },
    };
  }

  /**
   * Remove member from project.
   * Prevents removing owner and the last administrator.
   */
  public static async removeMember(
    projectId: string,
    targetUserId: string,
    currentUserId: string,
    currentUserRole: UserRole
  ): Promise<void> {
    const project = await Project.findById(projectId);
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    const isOwner = project.ownerId.toString() === currentUserId;
    const isSystemAdmin = currentUserRole === 'ADMIN';
    const requesterMembership = await ProjectMember.findOne({
      projectId,
      userId: currentUserId,
    });
    const isProjectAdmin = requesterMembership?.role === 'ADMIN';
    const isProjectManager = requesterMembership?.role === 'MANAGER';

    if (!isOwner && !isSystemAdmin && !isProjectAdmin && !isProjectManager) {
      throw new AppError('Manager or owner permissions required for this action', 403);
    }

    if (project.ownerId.toString() === targetUserId) {
      throw new AppError('Cannot remove the project owner from the project', 400);
    }

    const membership = await ProjectMember.findOne({ projectId, userId: targetUserId });
    if (!membership) {
      throw new AppError('Member not found in this project', 404);
    }

    if (membership.role === 'ADMIN' && !isOwner && !isSystemAdmin && !isProjectAdmin) {
      throw new AppError(
        'Only project administrators or the project owner can remove an administrator',
        403
      );
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await ProjectMember.countDocuments({ projectId, role: 'ADMIN' });
      if (adminCount <= 1) {
        throw new AppError('Cannot remove the last administrator of the project', 400);
      }
    }

    await ProjectMember.findByIdAndDelete(membership._id);

    await ActivityService.logActivity(projectId, currentUserId, 'MEMBER_REMOVED', null, {
      removedUserId: targetUserId,
    });

    await NotificationService.createNotification(
      targetUserId,
      'SYSTEM',
      `You have been removed from the project "${project.name}".`
    );
  }
}
