import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ID format (must be a valid MongoDB ObjectId)',
});

export const idParamSchema = z.object({
  id: objectIdSchema,
});

export const projectIdParamSchema = z.object({
  projectId: objectIdSchema,
});

export const taskIdParamSchema = z.object({
  taskId: objectIdSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
