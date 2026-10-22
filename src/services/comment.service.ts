import mongoose from 'mongoose';
import { Comment, IComment } from '../models/comment.model';
import { Task } from '../models/task.model';
import { ProjectService } from './project.service';
import { ActivityService } from './activity.service';
import { NotificationService } from './notification.service';
import { AppError } from '../utils/AppError';
import { UserRole } from '../types';

export class CommentService {
  public static async getTaskComments(
    taskId: string,
    userId: string,
    userRole: UserRole
  ): Promise<any[]> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await ProjectService.checkProjectAccess(task.projectId.toString(), userId, userRole);

    const comments = await Comment.find({ taskId })
      .sort({ createdAt: 1 })
      .populate('authorId', 'id name email avatar role')
      .lean();

    return comments.map((c: any) => ({
      id: c._id.toString(),
      taskId: c.taskId.toString(),
      author: c.authorId,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  public static async createComment(
    taskId: string,
    authorId: string,
    userRole: UserRole,
    content: string
  ): Promise<any> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new AppError('Task not found', 404);
    }

    await ProjectService.checkProjectAccess(task.projectId.toString(), authorId, userRole);

    const comment = await Comment.create({
      taskId: new mongoose.Types.ObjectId(taskId),
      authorId: new mongoose.Types.ObjectId(authorId),
      content,
    });

    const populated = await Comment.findById(comment._id).populate(
      'authorId',
      'id name email avatar role'
    );

    // Log activity
    await ActivityService.logActivity(
      task.projectId.toString(),
      authorId,
      'COMMENT_ADDED',
      task.id,
      {
        taskTitle: task.title,
      }
    );

    // Notify task assignee if someone else commented
    if (task.assigneeId && task.assigneeId.toString() !== authorId) {
      await NotificationService.createNotification(
        task.assigneeId.toString(),
        'COMMENT_ADDED',
        `A new comment was posted on task "${task.title}".`
      );
    }

    // Also notify creator if creator != author and creator != assignee
    if (
      task.creatorId.toString() !== authorId &&
      (!task.assigneeId || task.creatorId.toString() !== task.assigneeId.toString())
    ) {
      await NotificationService.createNotification(
        task.creatorId.toString(),
        'COMMENT_ADDED',
        `A new comment was posted on your task "${task.title}".`
      );
    }

    return {
      id: populated!.id,
      taskId: populated!.taskId.toString(),
      author: (populated as any).authorId,
      content: populated!.content,
      createdAt: populated!.createdAt,
      updatedAt: populated!.updatedAt,
    };
  }

  public static async updateComment(
    commentId: string,
    authorId: string,
    userRole: UserRole,
    content: string
  ): Promise<IComment> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (userRole !== 'ADMIN' && comment.authorId.toString() !== authorId) {
      throw new AppError('You can only edit your own comments', 403);
    }

    comment.content = content;
    await comment.save();

    return comment;
  }

  public static async deleteComment(
    commentId: string,
    authorId: string,
    userRole: UserRole
  ): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw new AppError('Comment not found', 404);
    }

    if (userRole !== 'ADMIN' && comment.authorId.toString() !== authorId) {
      throw new AppError('You can only delete your own comments', 403);
    }

    await Comment.findByIdAndDelete(commentId);
  }
}
