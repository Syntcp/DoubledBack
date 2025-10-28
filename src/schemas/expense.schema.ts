import { z } from 'zod';

export const expenseIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createExpenseSchema = z.object({
  vendor: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number().positive(),
  currency: z.string().min(3).max(8).optional().default('EUR'),
  frequency: z
    .enum(['ONE_OFF', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'])
    .optional()
    .default('ONE_OFF'),
  startDate: z.coerce.date().optional().default(() => new Date()),
  endDate: z.coerce.date().optional(),
  isActive: z.boolean().optional().default(true),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  active: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export const linkInvoiceSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  allocated: z.coerce.number().min(0).optional(),
});

export const financeSummaryQuery = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mode: z.enum(['paid', 'invoiced']).optional().default('paid'),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
