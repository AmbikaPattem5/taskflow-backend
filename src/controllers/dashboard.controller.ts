import { Request, Response } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';

export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  const metrics = await DashboardService.getDashboardMetrics(
    req.user!.id,
    req.user!.role
  );
  sendSuccess(res, metrics, 'Dashboard data retrieved successfully', 200);
});
