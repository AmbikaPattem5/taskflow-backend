import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await NotificationService.getUserNotifications(
    req.user!.id,
    page,
    limit
  );
  sendSuccess(
    res,
    {
      notifications: result.notifications,
      unreadCount: result.unreadCount,
    },
    'Notifications retrieved successfully',
    200,
    result.pagination
  );
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await NotificationService.markAsRead(
    req.params.id,
    req.user!.id
  );
  sendSuccess(res, notification, 'Notification marked as read', 200);
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(req.user!.id);
  sendSuccess(res, result, 'All notifications marked as read', 200);
});
