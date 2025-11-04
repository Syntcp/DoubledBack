import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8000),
  DATABASE_URL: z.string().url('DATABASE_URL doit être une URL valide (mysql://...)'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),
  GITHUB_TOKEN: z.string().optional(),
  GITLAB_TOKEN: z.string().optional(),
  TVA_FR_SERVICES_BASE: z.coerce.number().optional(),
  TVA_FR_SERVICES_MAJOR: z.coerce.number().optional(),
  TVA_STANDARD_RATE: z.coerce.number().optional(),
  MICRO_BNC_RATE: z.coerce.number().optional(),
  CFP_RATE: z.coerce.number().optional(),
  VAT_EXIGIBILITY: z.enum(['payments', 'invoices']).optional(),
  VAT_OPTION_ENABLED: z
    .union([z.literal('true'), z.literal('false')])
    .optional(),
  ACRE_REDUCTION_FACTOR: z.coerce.number().optional(),
  INCOME_TAX_RATE: z.coerce.number().optional(),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = parsed.data;
