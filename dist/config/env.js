"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const zod_1 = require("zod");
const EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.coerce.number().int().min(1).max(65535).default(8000),
    DATABASE_URL: zod_1.z.string().url('DATABASE_URL doit être une URL valide (mysql://...)'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    GITHUB_TOKEN: zod_1.z.string().optional(),
    GITLAB_TOKEN: zod_1.z.string().optional(),
});
const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
