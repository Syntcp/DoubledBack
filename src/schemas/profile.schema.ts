import { z } from 'zod';

export const upsertProfileSchema = z.object({
  companyName: z.string().min(1),
  fullName: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  postalCode: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().url().optional(),
});

