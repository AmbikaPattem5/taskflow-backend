import mongoose from 'mongoose';
import { Notification } from '../models/notification.model';
import { NotificationType, PaginationMeta } from '../types';
import { AppError } from '../utils/AppError';

export class NotificationService {
  public static async createNotification(
    userId: string | mongoose.Types.ObjectId,
    type: NotificationType,
    message: string
  ): Promise<void> {
    try {
      await Notification.create({
        userId,
        type,
        message,
      });
    } catch (err) {
      console.error('[NotificationService] Failed to create notification:', err);
    }
  }

  public static async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ notifications: any[]; unreadCount: number; pagination: PaginationMeta }> {
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId }),
      Notification.countDocuments({ userId, isRead: false }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      notifications: notifications.map((n) => ({
        ...n,
        id: (n as any)._id.toString(),
      })),
      unreadCount,
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

  public static async markAsRead(notificationId: string, userId: string): Promise<any> {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }

  public static async markAllAsRead(userId: string): Promise<{ updatedCount: number }> {
    const result = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
    return { updatedCount: result.modifiedCount };
  }
}
