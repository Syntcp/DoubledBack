import { z } from 'zod';

export const statusQuerySchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  mode: z.enum(['paid', 'invoiced']).optional().default('invoiced'),
});

export const contributionsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  mode: z.enum(['paid', 'invoiced']).optional().default('paid'),
  includeIncomeTax: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? false : v === 'true')),
  acre: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? false : v === 'true')),
  rateOverride: z.coerce.number().min(0).optional(),
});

export const vatEstimateQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  strategy: z.enum(['actual', 'standard']).optional().default('actual'),
  rate: z.coerce.number().min(0).max(100).optional(),
  basis: z.enum(['payments', 'invoices']).optional().default('payments'),
  includeCreditNotes: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? true : v === 'true')),
  includeAdvances: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => (v === undefined ? true : v === 'true')),
});

export type StatusQuery = z.infer<typeof statusQuerySchema>;
export type ContributionsQuery = z.infer<typeof contributionsQuerySchema>;
export type VatEstimateQuery = z.infer<typeof vatEstimateQuerySchema>;
