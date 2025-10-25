"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerProfile = getOwnerProfile;
exports.upsertOwnerProfile = upsertOwnerProfile;
// @ts-nocheck
const prisma_js_1 = require("../lib/prisma.js");
function toPublic(p) {
    return {
        ownerId: Number(p.ownerId),
        companyName: p.companyName,
        fullName: p.fullName ?? null,
        addressLine1: p.addressLine1 ?? null,
        addressLine2: p.addressLine2 ?? null,
        postalCode: p.postalCode ?? null,
        city: p.city ?? null,
        country: p.country ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        vatNumber: p.vatNumber ?? null,
        taxId: p.taxId ?? null,
        registrationNumber: p.registrationNumber ?? null,
        website: p.website ?? null,
        logoUrl: p.logoUrl ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
    };
}
async function getOwnerProfile(userId) {
    const uid = BigInt(userId);
    const p = await prisma_js_1.prisma.ownerProfile.findUnique({ where: { ownerId: uid } });
    if (!p)
        return null;
    return toPublic(p);
}
async function upsertOwnerProfile(userId, data) {
    const uid = BigInt(userId);
    const saved = await prisma_js_1.prisma.ownerProfile.upsert({
        where: { ownerId: uid },
        update: {
            companyName: data.companyName,
            fullName: data.fullName,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            email: data.email,
            phone: data.phone,
            vatNumber: data.vatNumber,
            taxId: data.taxId,
            registrationNumber: data.registrationNumber,
            website: data.website,
            logoUrl: data.logoUrl,
        },
        create: {
            ownerId: uid,
            companyName: data.companyName,
            fullName: data.fullName,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            postalCode: data.postalCode,
            city: data.city,
            country: data.country,
            email: data.email,
            phone: data.phone,
            vatNumber: data.vatNumber,
            taxId: data.taxId,
            registrationNumber: data.registrationNumber,
            website: data.website,
            logoUrl: data.logoUrl,
        },
    });
    return toPublic(saved);
}
