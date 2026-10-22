import mongoose from 'mongoose';
import { Activity } from '../models/activity.model';
import { ActivityAction } from '../types';

export class ActivityService {
  public static async logActivity(
    projectId: string | mongoose.Types.ObjectId,
    userId: string | mongoose.Types.ObjectId,
    action: ActivityAction,
    taskId?: string | mongoose.Types.ObjectId | null,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await Activity.create({
        projectId,
        taskId: taskId || null,
        userId,
        action,
        metadata,
      });
    } catch (err) {
      // Activity logging should not fail the main request, but should log error
      console.error('[ActivityService] Failed to log activity:', err);
    }
  }

  public static async getProjectActivities(
    projectId: string,
    limit: number = 20
  ): Promise<any[]> {
    return Activity.find({ projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'id name email avatar role')
      .populate('taskId', 'id title status')
      .lean();
  }
}
