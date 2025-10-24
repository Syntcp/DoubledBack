import { z } from 'zod';

export const createClientSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email().optional().or(z.literal('').transform(() => undefined)),
  phone: z.string().min(3).max(32).optional(),
  company: z.string().min(1).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const updateClientSchema = createClientSchema.partial();

export const clientIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listClientsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>;
