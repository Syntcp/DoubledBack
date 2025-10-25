import { z } from 'zod';

export const clientIdParamSchema = z.object({
  clientId: z.coerce.number().int().positive(),
});

export const invoiceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const invoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const createInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  issueDate: z.coerce.date().optional().default(() => new Date()),
  dueDate: z.coerce.date(),
  currency: z.string().min(3).max(8).optional().default('EUR'),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1),
});

export const updateInvoiceSchema = z.object({
  number: z.string().min(1).optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  currency: z.string().min(3).max(8).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1).optional(),
});

export const addPaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(['CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'OTHER']).default('OTHER'),
  reference: z.string().optional(),
  receivedAt: z.coerce.date().optional().default(() => new Date()),
  notes: z.string().optional(),
});

export const listInvoicesQuerySchema = z.object({
  status: z
    .enum(['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'])
    .optional(),
  overdue: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
