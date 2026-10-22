import mongoose from 'mongoose';
import { Project } from '../models/project.model';
import { ProjectMember } from '../models/projectMember.model';
import { Task } from '../models/task.model';
import { Activity } from '../models/activity.model';
import { UserRole } from '../types';

export class DashboardService {
  public static async getDashboardMetrics(
    userId: string,
    userRole: UserRole
  ): Promise<any> {
    let accessibleProjectIds: mongoose.Types.ObjectId[] = [];

    if (userRole === 'ADMIN') {
      const allProjects = await Project.find({}).select('_id');
      accessibleProjectIds = allProjects.map((p) => p._id as mongoose.Types.ObjectId);
    } else {
      const [ownedProjects, memberProjects] = await Promise.all([
        Project.find({ ownerId: userId }).select('_id'),
        ProjectMember.find({ userId }).select('projectId'),
      ]);

      const ownedIds = ownedProjects.map((p) => p._id as mongoose.Types.ObjectId);
      const memberIds = memberProjects.map((m) => m.projectId);
      const combined = new Set([
        ...ownedIds.map((id) => id.toString()),
        ...memberIds.map((id) => id.toString()),
      ]);

      accessibleProjectIds = Array.from(combined).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }

    const [
      totalProjects,
      totalTasks,
      myTasksCount,
      completedTasksCount,
      tasks,
      recentActivities,
      upcomingTasks,
      activeProjects,
    ] = await Promise.all([
      Project.countDocuments({ _id: { $in: accessibleProjectIds } }),
      Task.countDocuments({ projectId: { $in: accessibleProjectIds } }),
      Task.countDocuments({
        projectId: { $in: accessibleProjectIds },
        assigneeId: userId,
      }),
      Task.countDocuments({
        projectId: { $in: accessibleProjectIds },
        status: 'DONE',
      }),
      Task.find({ projectId: { $in: accessibleProjectIds } }).select('status priority'),
      Activity.find({ projectId: { $in: accessibleProjectIds } })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('userId', 'id name email avatar')
        .populate('projectId', 'id name')
        .populate('taskId', 'id title')
        .lean(),
      Task.find({
        projectId: { $in: accessibleProjectIds },
        dueDate: { $gte: new Date() },
        status: { $ne: 'DONE' },
      })
        .sort({ dueDate: 1 })
        .limit(5)
        .populate('projectId', 'id name')
        .populate('assigneeId', 'id name email avatar')
        .lean(),
      Project.find({ _id: { $in: accessibleProjectIds }, status: 'ACTIVE' })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate('ownerId', 'id name email avatar')
        .lean(),
    ]);

    const tasksByStatus = {
      TODO: tasks.filter((t) => t.status === 'TODO').length,
      IN_PROGRESS: tasks.filter((t) => t.status === 'IN_PROGRESS').length,
      IN_REVIEW: tasks.filter((t) => t.status === 'IN_REVIEW').length,
      DONE: tasks.filter((t) => t.status === 'DONE').length,
    };

    const tasksByPriority = {
      LOW: tasks.filter((t) => t.priority === 'LOW').length,
      MEDIUM: tasks.filter((t) => t.priority === 'MEDIUM').length,
      HIGH: tasks.filter((t) => t.priority === 'HIGH').length,
      URGENT: tasks.filter((t) => t.priority === 'URGENT').length,
    };

    return {
      overview: {
        totalProjects,
        totalTasks,
        myTasksCount,
        completedTasksCount,
      },
      tasksByStatus,
      tasksByPriority,
      recentActivities: recentActivities.map((a: any) => ({
        ...a,
        id: a._id.toString(),
      })),
      upcomingTasks: upcomingTasks.map((t: any) => ({
        ...t,
        id: t._id.toString(),
      })),
      activeProjects: activeProjects.map((p: any) => ({
        ...p,
        id: p._id.toString(),
      })),
    };
  }
}
