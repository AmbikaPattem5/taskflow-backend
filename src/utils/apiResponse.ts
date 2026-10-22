import { Response } from 'express';
import { ApiResponse, PaginationMeta } from '../types';

export const sendSuccess = <T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  pagination?: PaginationMeta
): Response => {
  const responseBody: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(pagination && { pagination }),
  };

  return res.status(statusCode).json(responseBody);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any
): Response => {
  const responseBody: ApiResponse = {
    success: false,
    message,
    ...(errors !== undefined && { errors }),
  };

  return res.status(statusCode).json(responseBody);
};
