import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
});

export const listLogsQuerySchema = paginationSchema.extend({
  entityType: z.string().min(1).optional(),
  action: z.string().min(1).optional(),
  actorUserId: z.coerce.number().int().positive().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const listHttpLogsQuerySchema = paginationSchema.extend({
  requestId: z.string().min(1).optional(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']).optional(),
  statusCode: z.coerce.number().int().nonnegative().optional(),
  url: z.string().min(1).optional(), // supports partial match
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

export const entityLogsParamsSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.coerce.number().int().positive(),
});

export const logIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const requestIdParamSchema = z.object({ requestId: z.string().min(1) });

