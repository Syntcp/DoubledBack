"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.upsertProfileSchema = void 0;
const zod_1 = require("zod");
exports.upsertProfileSchema = zod_1.z.object({
    companyName: zod_1.z.string().min(1),
    fullName: zod_1.z.string().optional(),
    addressLine1: zod_1.z.string().optional(),
    addressLine2: zod_1.z.string().optional(),
    postalCode: zod_1.z.string().optional(),
    city: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    vatNumber: zod_1.z.string().optional(),
    taxId: zod_1.z.string().optional(),
    registrationNumber: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    logoUrl: zod_1.z.string().url().optional(),
});
