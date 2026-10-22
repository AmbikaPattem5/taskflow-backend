import { z } from 'zod';
import { paginationQuerySchema } from './common.schema';

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(100, 'Project name cannot exceed 100 characters'),
  description: z.string().trim().max(1000, 'Description cannot exceed 1000 characters').optional().default(''),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional().default('ACTIVE'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional().default('MEDIUM'),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  color: z.string().trim().max(50).optional().default('#3B82F6'),
  icon: z.string().trim().max(50).optional().default('folder'),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(2, 'Project name must be at least 2 characters').max(100).optional(),
  description: z.string().trim().max(1000).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  startDate: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  color: z.string().trim().max(50).optional(),
  icon: z.string().trim().max(50).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const projectQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['ACTIVE', 'ARCHIVED', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQueryInput = z.infer<typeof projectQuerySchema>;
