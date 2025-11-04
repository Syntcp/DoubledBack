"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvoicesQuerySchema = exports.addPaymentSchema = exports.updateInvoiceSchema = exports.createInvoiceSchema = exports.invoiceItemSchema = exports.invoiceIdParamSchema = exports.clientIdParamSchema = void 0;
const zod_1 = require("zod");
exports.clientIdParamSchema = zod_1.z.object({
    clientId: zod_1.z.coerce.number().int().positive(),
});
exports.invoiceIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
exports.invoiceItemSchema = zod_1.z.object({
    description: zod_1.z.string().min(1),
    quantity: zod_1.z.coerce.number().positive().default(1),
    unitPrice: zod_1.z.coerce.number().min(0),
    taxRate: zod_1.z.coerce.number().min(0).max(100).default(0),
});
exports.createInvoiceSchema = zod_1.z.object({
    number: zod_1.z.string().min(1).optional(),
    issueDate: zod_1.z.coerce.date().optional().default(() => new Date()),
    dueDate: zod_1.z.coerce.date(),
    currency: zod_1.z.string().min(3).max(8).optional().default('EUR'),
    notes: zod_1.z.string().optional(),
    terms: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.invoiceItemSchema).min(1),
    // Exceptions de conformité TVA (ex: autoliquidation intra-UE)
    reverseCharge: zod_1.z.boolean().optional().default(false),
});
exports.updateInvoiceSchema = zod_1.z.object({
    number: zod_1.z.string().min(1).optional(),
    issueDate: zod_1.z.coerce.date().optional(),
    dueDate: zod_1.z.coerce.date().optional(),
    currency: zod_1.z.string().min(3).max(8).optional(),
    notes: zod_1.z.string().optional(),
    terms: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.invoiceItemSchema).min(1).optional(),
    reverseCharge: zod_1.z.boolean().optional(),
});
exports.addPaymentSchema = zod_1.z.object({
    amount: zod_1.z.coerce.number().positive(),
    method: zod_1.z.enum(['CARD', 'BANK_TRANSFER', 'CASH', 'CHECK', 'OTHER']).default('OTHER'),
    reference: zod_1.z.string().optional(),
    receivedAt: zod_1.z.coerce.date().optional().default(() => new Date()),
    notes: zod_1.z.string().optional(),
});
exports.listInvoicesQuerySchema = zod_1.z.object({
    status: zod_1.z
        .enum(['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'])
        .optional(),
    overdue: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? undefined : v === 'true')),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
