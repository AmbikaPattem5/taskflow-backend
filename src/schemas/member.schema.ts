import { z } from 'zod';
import { objectIdSchema } from './common.schema';

export const addMemberSchema = z.object({
  userId: objectIdSchema.optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
}).refine(data => data.userId || data.email, {
  message: 'Must provide either userId or email to add a member',
});

export const memberQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
  status: z.string().trim().optional(),
  sortBy: z.enum(['name', 'email', 'joinedAt', 'createdAt']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  projectId: objectIdSchema.optional(),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']),
  projectId: objectIdSchema.optional(),
});

export const createSystemMemberSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address').toLowerCase(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).default('MEMBER'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  projectId: objectIdSchema.optional(),
});

export const updateMemberSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'MEMBER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  projectId: objectIdSchema.optional(),
});

export const updateMemberStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type MemberQueryInput = z.infer<typeof memberQuerySchema>;
export type CreateSystemMemberInput = z.infer<typeof createSystemMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type UpdateMemberStatusInput = z.infer<typeof updateMemberStatusSchema>;

