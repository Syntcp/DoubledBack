import { z } from 'zod';

export const clientIdParamSchema = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const websiteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listWebsitesQuerySchemaOwner = z.object({
  q: z.string().optional(),
  clientId: z.coerce.number().int().positive().optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const createWebsiteSchema = z.object({
  name: z.string().min(1),
  logo: z.string().min(1),
  url: z.string().url(),
  description: z.string().min(1),
  techStack: z.array(z.string()).nonempty(),
  media: z.string().min(1),
  category: z.string().min(1),
});

export const updateWebsiteSchema = createWebsiteSchema.partial();

export type CreateWebsiteInput = z.infer<typeof createWebsiteSchema>;
export type UpdateWebsiteInput = z.infer<typeof updateWebsiteSchema>;
export type ListWebsitesQueryOwner = z.infer<typeof listWebsitesQuerySchemaOwner>;

