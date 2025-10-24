import { prisma } from '../lib/prisma.js';

export type ClientPublic = {
  id: number;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  notes?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownerId?: number | null;
};

function toPublic(c: any): ClientPublic {
  return {
    id: Number(c.id),
    fullName: c.fullName,
    email: c.email ?? null,
    phone: c.phone ?? null,
    company: c.company ?? null,
    notes: c.notes ?? null,
    isActive: c.isActive,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ownerId: c.ownerId == null ? null : Number(c.ownerId),
  };
}

export async function listClients(userId: number, opts: { q?: string; page: number; pageSize: number }) {
  const uid = BigInt(userId);
  const { q, page, pageSize } = opts;
  const skip = (page - 1) * pageSize;
  const where: any = { ownerId: uid };
  if (q && q.length > 0) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' as const } },
      { email: { contains: q, mode: 'insensitive' as const } },
      { company: { contains: q, mode: 'insensitive' as const } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.client.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
    prisma.client.count({ where }),
  ]);

  return { items: items.map(toPublic), total, page, pageSize };
}

export async function getClient(userId: number, id: number) {
  const uid = BigInt(userId);
  const cid = BigInt(id);
  const c = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!c) throw Object.assign(new Error('Client introuvable'), { status: 404 });
  return toPublic(c);
}

export async function createClient(userId: number, data: {
  fullName: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const uid = BigInt(userId);
  const c = await prisma.client.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      notes: data.notes,
      isActive: data.isActive ?? true,
      ownerId: uid,
    },
  });
  return toPublic(c);
}

export async function updateClient(userId: number, id: number, data: {
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  isActive?: boolean;
}) {
  const uid = BigInt(userId);
  const cid = BigInt(id);
  const exists = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!exists) throw Object.assign(new Error('Client introuvable'), { status: 404 });

  const updated = await prisma.client.update({
    where: { id: cid },
    data: {
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      company: data.company,
      notes: data.notes,
      isActive: data.isActive,
    },
  });
  return toPublic(updated);
}

export async function deleteClient(userId: number, id: number) {
  const uid = BigInt(userId);
  const cid = BigInt(id);
  const del = await prisma.client.deleteMany({ where: { id: cid, ownerId: uid } });
  if (del.count === 0) throw Object.assign(new Error('Client introuvable'), { status: 404 });
}

