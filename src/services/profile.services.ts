// @ts-nocheck
import { prisma } from '../lib/prisma.js';

export type OwnerProfilePublic = {
  ownerId: number;
  companyName: string;
  fullName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  taxId?: string | null;
  registrationNumber?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toPublic(p: any): OwnerProfilePublic {
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

export async function getOwnerProfile(userId: number) {
  const uid = BigInt(userId);
  const p = await prisma.ownerProfile.findUnique({ where: { ownerId: uid } });
  if (!p) return null;
  return toPublic(p);
}

export async function upsertOwnerProfile(userId: number, data: Partial<OwnerProfilePublic> & { companyName: string }) {
  const uid = BigInt(userId);
  const saved = await prisma.ownerProfile.upsert({
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
