import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/apiResponse';
import { AppError } from '../utils/AppError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  sendSuccess(res, result, 'User registered successfully', 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  sendSuccess(res, result, 'Login successful', 200);
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await AuthService.getMe(req.user!.id);
  sendSuccess(res, { user }, 'Current user retrieved successfully', 200);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, null, 'Logged out successfully. Please remove token on the client.', 200);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await AuthService.forgotPassword(req.body);
  sendSuccess(res, result, result.message, 200);
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const token = req.params.token || req.body.token;
  if (!token) {
    throw new AppError('Password reset token is required.', 400);
  }
  const result = await AuthService.resetPassword(token, req.body.password);
  sendSuccess(res, null, result.message, 200);
});
