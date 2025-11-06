"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdParamSchema = exports.logIdParamSchema = exports.entityLogsParamsSchema = exports.listHttpLogsQuerySchema = exports.listLogsQuerySchema = exports.paginationSchema = void 0;
const zod_1 = require("zod");
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).default(20),
});
exports.listLogsQuerySchema = exports.paginationSchema.extend({
    entityType: zod_1.z.string().min(1).optional(),
    action: zod_1.z.string().min(1).optional(),
    actorUserId: zod_1.z.coerce.number().int().positive().optional(),
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
});
exports.listHttpLogsQuerySchema = exports.paginationSchema.extend({
    requestId: zod_1.z.string().min(1).optional(),
    method: zod_1.z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']).optional(),
    statusCode: zod_1.z.coerce.number().int().nonnegative().optional(),
    url: zod_1.z.string().min(1).optional(), // supports partial match
    from: zod_1.z.string().datetime().optional(),
    to: zod_1.z.string().datetime().optional(),
});
exports.entityLogsParamsSchema = zod_1.z.object({
    entityType: zod_1.z.string().min(1),
    entityId: zod_1.z.coerce.number().int().positive(),
});
exports.logIdParamSchema = zod_1.z.object({ id: zod_1.z.coerce.number().int().positive() });
exports.requestIdParamSchema = zod_1.z.object({ requestId: zod_1.z.string().min(1) });
