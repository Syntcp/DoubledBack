import { z } from 'zod';

export const clientIdParamSchema = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const projectIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listProjectsQuerySchema = z.object({
  includeMeta: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? true : v === 'true')),
});

export const listProjectsQuerySchemaOwner = z.object({
  q: z.string().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  provider: z.enum(['GITHUB', 'GITLAB', 'OTHER']).optional(),
  online: z.union([z.literal('true'), z.literal('false')]).optional()
    .transform(v => v === undefined ? undefined : v === 'true'),
  includeMeta: z.union([z.literal('true'), z.literal('false')]).optional()
    .transform(v => v === undefined ? true : v === 'true'),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const repoProviderEnum = z.enum(['GITHUB', 'GITLAB', 'OTHER']).optional();

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoProvider: repoProviderEnum,
  repoUrl: z.string().url().optional(),
  repoOwner: z.string().min(1).optional(),
  repoName: z.string().min(1).optional(),
  defaultBranch: z.string().min(1).optional(),
  liveUrl: z.string().url().optional(),
  healthUrl: z.string().url().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
