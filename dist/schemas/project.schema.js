"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectSchema = exports.createProjectSchema = exports.listProjectsQuerySchemaOwner = exports.listProjectsQuerySchema = exports.projectIdParamSchema = exports.clientIdParamSchema = void 0;
const zod_1 = require("zod");
exports.clientIdParamSchema = zod_1.z.object({
    clientId: zod_1.z.coerce.number().int().positive(),
});
exports.projectIdParamSchema = zod_1.z.object({
    id: zod_1.z.coerce.number().int().positive(),
});
exports.listProjectsQuerySchema = zod_1.z.object({
    includeMeta: zod_1.z
        .union([zod_1.z.literal('true'), zod_1.z.literal('false')])
        .optional()
        .transform((v) => (v === undefined ? true : v === 'true')),
});
exports.listProjectsQuerySchemaOwner = zod_1.z.object({
    q: zod_1.z.string().optional(),
    clientId: zod_1.z.coerce.number().int().positive().optional(),
    provider: zod_1.z.enum(['GITHUB', 'GITLAB', 'OTHER']).optional(),
    online: zod_1.z.union([zod_1.z.literal('true'), zod_1.z.literal('false')]).optional()
        .transform(v => v === undefined ? undefined : v === 'true'),
    includeMeta: zod_1.z.union([zod_1.z.literal('true'), zod_1.z.literal('false')]).optional()
        .transform(v => v === undefined ? true : v === 'true'),
    page: zod_1.z.coerce.number().int().min(1).optional().default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).optional().default(20),
});
const repoProviderEnum = zod_1.z.enum(['GITHUB', 'GITLAB', 'OTHER']).optional();
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    repoProvider: repoProviderEnum,
    repoUrl: zod_1.z.string().url().optional(),
    repoOwner: zod_1.z.string().min(1).optional(),
    repoName: zod_1.z.string().min(1).optional(),
    defaultBranch: zod_1.z.string().min(1).optional(),
    liveUrl: zod_1.z.string().url().optional(),
    healthUrl: zod_1.z.string().url().optional(),
});
exports.updateProjectSchema = exports.createProjectSchema.partial();
