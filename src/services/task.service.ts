import mongoose from 'mongoose';
import { Task, ITask } from '../models/task.model';
import { Comment } from '../models/comment.model';
import { ProjectService } from './project.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { CreateTaskInput, UpdateTaskInput, TaskQueryInput } from '../schemas/task.schema';
import { PaginationMeta, UserRole } from '../types';

export class TaskService {
  public static async getProjectTasks(
    projectId: string,
    userId: string,
    userRole: UserRole,
    query: TaskQueryInput
  ): Promise<{ tasks: any[]; pagination: PaginationMeta }> {
    await ProjectService.checkProjectAccess(projectId, userId, userRole);

    const { page = 1, limit = 20, search, status, priority, assigneeId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const filter: any = { projectId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) {
      if (assigneeId === 'unassigned') {
        filter.assigneeId = null;
      } else {
        filter.assigneeId = assigneeId;
      }
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('assigneeId', 'id name email avatar')
        .populate('creatorId', 'id name email avatar')
        .lean(),
      Task.countDocuments(filter),
    ]);

    // Attach comment counts
    const tasksWithCounts = await Promise.all(
      tasks.map(async (task) => {
        const commentCount = await Comment.countDocuments({ taskId: task._id });
        return {
          ...task,
          id: (task as any)._id.toString(),
          commentCount,
        };
      })
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      tasks: tasksWithCounts,
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

  public static async getTaskById(
    taskId: string,
    userId: string,
    userRole: UserRole
  ): Promise<any> {
    const task = await Task.findById(taskId)
      .populate('assigneeId', 'id name email avatar')
      .populate('creatorId', 'id name email avatar')
      .populate('projectId', 'id name status');

    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await ProjectService.checkProjectAccess(task.projectId._id.toString(), userId, userRole);

    const commentCount = await Comment.countDocuments({ taskId: task._id });

    return {
      ...task.toJSON(),
      commentCount,
    };
  }

  public static async createTask(
    projectId: string,
    creatorId: string,
    userRole: UserRole,
    data: CreateTaskInput
  ): Promise<ITask> {
    const project = await ProjectService.checkProjectAccess(projectId, creatorId, userRole);

    const task = await Task.create({
      projectId: new mongoose.Types.ObjectId(projectId),
      creatorId: new mongoose.Types.ObjectId(creatorId),
      title: data.title,
      description: data.description,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
      assigneeId: data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    });

    await ActivityService.logActivity(projectId, creatorId, 'TASK_CREATED', task.id, {
      taskTitle: task.title,
      status: task.status,
    });

    if (task.assigneeId && task.assigneeId.toString() !== creatorId) {
      await NotificationService.createNotification(
        task.assigneeId.toString(),
        'TASK_ASSIGNED',
        `You were assigned to task "${task.title}" in project "${project.name}".`
      );
    }

    return task;
  }

  public static async updateTask(
    taskId: string,
    userId: string,
    userRole: UserRole,
    data: UpdateTaskInput
  ): Promise<ITask> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    const project = await ProjectService.checkProjectAccess(
      task.projectId.toString(),
      userId,
      userRole
    );

    const oldStatus = task.status;
    const oldAssigneeId = task.assigneeId ? task.assigneeId.toString() : null;

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.status !== undefined) task.status = data.status;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.assigneeId !== undefined) {
      task.assigneeId = data.assigneeId ? new mongoose.Types.ObjectId(data.assigneeId) : null;
    }
    if (data.dueDate !== undefined) {
      task.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    await task.save();

    // Log status change activity and notify
    if (data.status && data.status !== oldStatus) {
      await ActivityService.logActivity(
        task.projectId.toString(),
        userId,
        'TASK_STATUS_CHANGED',
        task.id,
        {
          taskTitle: task.title,
          oldStatus,
          newStatus: data.status,
        }
      );

      // Notify assignee if not the updater
      if (task.assigneeId && task.assigneeId.toString() !== userId) {
        await NotificationService.createNotification(
          task.assigneeId.toString(),
          'TASK_STATUS_CHANGED',
          `Task "${task.title}" status changed to ${task.status}.`
        );
      }
    } else {
      await ActivityService.logActivity(task.projectId.toString(), userId, 'TASK_UPDATED', task.id, {
        taskTitle: task.title,
        updatedFields: Object.keys(data),
      });
    }

    // Notify new assignee if changed
    const newAssigneeId = task.assigneeId ? task.assigneeId.toString() : null;
    if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== userId) {
      await ActivityService.logActivity(task.projectId.toString(), userId, 'TASK_ASSIGNED', task.id, {
        taskTitle: task.title,
        assigneeId: newAssigneeId,
      });

      await NotificationService.createNotification(
        newAssigneeId,
        'TASK_ASSIGNED',
        `You were assigned to task "${task.title}" in project "${project.name}".`
      );
    }

    return task;
  }

  public static async deleteTask(
    taskId: string,
    userId: string,
    userRole: UserRole
  ): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await ProjectService.checkProjectAccess(
      task.projectId.toString(),
      userId,
      userRole,
      'MANAGER'
    );

    await Promise.all([
      Comment.deleteMany({ taskId }),
      Task.findByIdAndDelete(taskId),
    ]);

    await ActivityService.logActivity(task.projectId.toString(), userId, 'TASK_DELETED', null, {
      taskTitle: task.title,
    });
  }
}
