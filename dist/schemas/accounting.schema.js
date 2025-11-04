"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vatEstimateQuerySchema = exports.contributionsQuerySchema = exports.statusQuerySchema = void 0;
const zod_1 = require("zod");
exports.statusQuerySchema = zod_1.z.object({
    year: zod_1.z.coerce.number().int().min(2000).max(2100).optional(),
    mode: zod_1.z.enum(['paid', 'invoiced']).optional().default('invoiced'),
});
exports.contributionsQuerySchema = zod_1.z.object({
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
    mode: zod_1.z.enum(['paid', 'invoiced']).optional().default('paid'),
    includeIncomeTax: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? false : v === 'true')),
    acre: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? false : v === 'true')),
    rateOverride: zod_1.z.coerce.number().min(0).optional(),
});
exports.vatEstimateQuerySchema = zod_1.z.object({
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
    strategy: zod_1.z.enum(['actual', 'standard']).optional().default('actual'),
    rate: zod_1.z.coerce.number().min(0).max(100).optional(),
    basis: zod_1.z.enum(['payments', 'invoices']).optional().default('payments'),
    includeCreditNotes: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? true : v === 'true')),
    includeAdvances: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? true : v === 'true')),
});
