import mongoose from 'mongoose';
import { Project, IProject } from '../models/project.model';
import { ProjectMember } from '../models/projectMember.model';
import { Task } from '../models/task.model';
import { Comment } from '../models/comment.model';
import { Activity } from '../models/activity.model';
import { ActivityService } from './activity.service';
import { AppError } from '../utils/AppError';
import { CreateProjectInput, UpdateProjectInput, ProjectQueryInput } from '../schemas/project.schema';
import { PaginationMeta, UserRole } from '../types';

export class ProjectService {
  public static async isUserProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await ProjectMember.findOne({ projectId, userId });
    return !!member;
  }

  public static async checkProjectAccess(
    projectId: string,
    userId: string,
    userRole: UserRole,
    requiredRole?: 'OWNER' | 'MANAGER'
  ): Promise<IProject> {
    const project = await Project.findById(projectId).populate('ownerId', 'id name email avatar');
    if (!project) {
      throw new AppError('Project not found', 404);
    }

    if (userRole === 'ADMIN') {
      return project;
    }

    const isOwner = project.ownerId._id ? project.ownerId._id.toString() === userId : (project.ownerId as any).toString() === userId;

    if (requiredRole === 'OWNER') {
      if (!isOwner) {
        throw new AppError('Only the project owner or system admin can perform this action', 403);
      }
      return project;
    }

    const membership = await ProjectMember.findOne({ projectId, userId });

    if (requiredRole === 'MANAGER') {
      if (!isOwner && (!membership || membership.role === 'MEMBER')) {
        throw new AppError('Manager or owner permissions required for this action', 403);
      }
      return project;
    }

    if (!isOwner && !membership) {
      throw new AppError('You do not have permission to access this project', 403);
    }

    return project;
  }

  public static async createProject(
    userId: string,
    data: CreateProjectInput
  ): Promise<IProject> {
    const project = await Project.create({
      name: data.name,
      description: data.description,
      status: data.status,
      priority: data.priority,
      startDate: data.startDate,
      dueDate: data.dueDate,
      color: data.color,
      icon: data.icon,
      ownerId: new mongoose.Types.ObjectId(userId),
    });

    // Automatically add creator as ADMIN member of the project
    await ProjectMember.create({
      projectId: project._id,
      userId: new mongoose.Types.ObjectId(userId),
      role: 'ADMIN',
    });

    await ActivityService.logActivity(project.id, userId, 'PROJECT_CREATED', null, {
      projectName: project.name,
    });

    return project;
  }

  public static async getProjects(
    userId: string,
    userRole: UserRole,
    query: ProjectQueryInput
  ): Promise<{ projects: any[]; pagination: PaginationMeta }> {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Access control: ADMIN sees all projects, others see only projects they belong to
    if (userRole !== 'ADMIN') {
      const memberships = await ProjectMember.find({ userId }).select('projectId');
      const projectIds = memberships.map((m) => m.projectId);
      filter.$or = [{ ownerId: userId }, { _id: { $in: projectIds } }];
    }

    if (status) {
      filter.status = status;
    }

    if (query.priority) {
      filter.priority = query.priority;
    }

    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('ownerId', 'id name email avatar')
        .lean(),
      Project.countDocuments(filter),
    ]);

    // Enhance project items with memberCount and taskCount
    const enhancedProjects = await Promise.all(
      projects.map(async (project) => {
        const [memberCount, taskCount] = await Promise.all([
          ProjectMember.countDocuments({ projectId: project._id }),
          Task.countDocuments({ projectId: project._id }),
        ]);

        return {
          ...project,
          id: (project as any)._id.toString(),
          memberCount,
          taskCount,
        };
      })
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      projects: enhancedProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  public static async getProjectById(
    projectId: string,
    userId: string,
    userRole: UserRole
  ): Promise<any> {
    const project = await this.checkProjectAccess(projectId, userId, userRole);

    const [memberCount, tasks] = await Promise.all([
      ProjectMember.countDocuments({ projectId }),
      Task.find({ projectId }).select('status priority').lean(),
    ]);

    const taskStats = {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'TODO').length,
      inProgress: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      inReview: tasks.filter((t) => t.status === 'IN_REVIEW').length,
      done: tasks.filter((t) => t.status === 'DONE').length,
    };

    return {
      ...project.toJSON(),
      memberCount,
      taskStats,
    };
  }

  public static async updateProject(
    projectId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateProjectInput
  ): Promise<IProject> {
    const project = await this.checkProjectAccess(projectId, userId, userRole, 'MANAGER');

    if (data.name !== undefined) project.name = data.name;
    if (data.description !== undefined) project.description = data.description;
    if (data.status !== undefined) project.status = data.status;
    if (data.priority !== undefined) project.priority = data.priority;
    if (data.startDate !== undefined) project.startDate = data.startDate;
    if (data.dueDate !== undefined) project.dueDate = data.dueDate;
    if (data.color !== undefined) project.color = data.color;
    if (data.icon !== undefined) project.icon = data.icon;

    await project.save();

    await ActivityService.logActivity(projectId, userId, 'PROJECT_UPDATED', null, {
      updatedFields: Object.keys(data),
    });

    return project;
  }

  public static async deleteProject(
    projectId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    await this.checkProjectAccess(projectId, userId, userRole, 'OWNER');

    // Find all tasks to delete their comments
    const tasks = await Task.find({ projectId }).select('_id');
    const taskIds = tasks.map((t) => t._id);

    await Promise.all([
      Comment.deleteMany({ taskId: { $in: taskIds } }),
      Task.deleteMany({ projectId }),
      ProjectMember.deleteMany({ projectId }),
      Activity.deleteMany({ projectId }),
      Project.findByIdAndDelete(projectId),
    ]);
  }
}
