"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financeSummaryQuery = exports.linkInvoiceSchema = exports.listExpenseQuerySchema = exports.updateExpenseSchema = exports.createExpenseSchema = exports.expenseIdParamSchema = void 0;
const zod_1 = require("zod");
exports.expenseIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
exports.createExpenseSchema = zod_1.z.object({
    vendor: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    amount: zod_1.z.coerce.number().positive(),
    currency: zod_1.z.string().min(3).max(8).optional().default('EUR'),
    frequency: zod_1.z
        .enum(['ONE_OFF', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'])
        .optional()
        .default('ONE_OFF'),
    startDate: zod_1.z.coerce.date().optional().default(() => new Date()),
    endDate: zod_1.z.coerce.date().optional(),
    isActive: zod_1.z.boolean().optional().default(true),
});
exports.updateExpenseSchema = exports.createExpenseSchema.partial();
exports.listExpenseQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
    active: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
});
exports.linkInvoiceSchema = zod_1.z.object({
    invoiceId: zod_1.z.coerce.number().int().positive(),
    allocated: zod_1.z.coerce.number().min(0).optional(),
});
exports.financeSummaryQuery = zod_1.z.object({
    from: zod_1.z.coerce.date().optional(),
    to: zod_1.z.coerce.date().optional(),
    mode: zod_1.z.enum(['paid', 'invoiced']).optional().default('paid'),
});
