"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClientsQuerySchema = exports.clientIdParamSchema = exports.updateClientSchema = exports.createClientSchema = void 0;
const zod_1 = require("zod");
exports.createClientSchema = zod_1.z.object({
    fullName: zod_1.z.string().min(1),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('').transform(() => undefined)),
    phone: zod_1.z.string().min(3).max(32).optional(),
    company: zod_1.z.string().min(1).optional(),
    notes: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
});
exports.updateClientSchema = exports.createClientSchema.partial();
exports.clientIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
exports.listClientsQuerySchema = zod_1.z.object({
    q: zod_1.z.string().trim().min(1).optional(),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
