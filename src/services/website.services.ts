import { prisma } from '../lib/prisma.js';

export type WebsitePublic = {
  id: number;
  clientId: number;
  name: string;
  logo: string;
  url: string;
  description: string;
  techStack: string[];
  media: string;
  category: string;
};

function toPublic(w: any): WebsitePublic {
  const tech = Array.isArray(w.techStack)
    ? (w.techStack as unknown[]).map(String)
    : [];
  return {
    id: Number(w.id),
    clientId: Number(w.clientId),
    name: w.name,
    logo: w.logo,
    url: w.url,
    description: w.description,
    techStack: tech,
    media: w.media,
    category: w.category,
  };
}

export async function listWebsitesByClient(userId: number, clientId: number) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);
  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });

  const items = await prisma.websites.findMany({ where: { clientId: cid } });
  return items.map(toPublic);
}

export async function listWebsitesForOwner(
  userId: number,
  opts: { q?: string; clientId?: number; category?: string; page: number; pageSize: number },
) {
  const uid = BigInt(userId);
  const { q, clientId, category, page, pageSize } = opts;
  const skip = (page - 1) * pageSize;

  const where: any = { client: { ownerId: uid } };
  if (clientId) where.clientId = BigInt(clientId);
  if (category && category.trim()) where.category = { contains: category, mode: 'insensitive' };
  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { url: { contains: q, mode: 'insensitive' } },
      { category: { contains: q, mode: 'insensitive' } },
      { client: { fullName: { contains: q, mode: 'insensitive' } } },
      { client: { company: { contains: q, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.websites.findMany({ where, skip, take: pageSize, orderBy: { id: 'desc' }, include: { client: true } }),
    prisma.websites.count({ where }),
  ]);

  return { items: items.map(toPublic), total, page, pageSize };
}

export async function getWebsite(userId: number, id: number) {
  const uid = BigInt(userId);
  const wid = BigInt(id);
  const w = await prisma.websites.findFirst({ where: { id: wid, client: { ownerId: uid } } });
  if (!w) throw Object.assign(new Error('Site introuvable'), { status: 404 });
  return toPublic(w);
}

export async function createWebsite(
  userId: number,
  clientId: number,
  data: { name: string; logo: string; url: string; description: string; techStack: string[]; media: string; category: string },
) {
  const uid = BigInt(userId);
  const cid = BigInt(clientId);
  const client = await prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
  if (!client) throw Object.assign(new Error('Client introuvable'), { status: 404 });

  const created = await prisma.websites.create({
    data: {
      clientId: cid,
      name: data.name,
      logo: data.logo,
      url: data.url,
      description: data.description,
      techStack: data.techStack as any,
      media: data.media,
      category: data.category,
    },
  });
  return toPublic(created);
}

export async function updateWebsite(
  userId: number,
  id: number,
  data: Partial<{ name: string; logo: string; url: string; description: string; techStack: string[]; media: string; category: string }>,
) {
  const uid = BigInt(userId);
  const wid = BigInt(id);
  const exists = await prisma.websites.findFirst({ where: { id: wid, client: { ownerId: uid } } });
  if (!exists) throw Object.assign(new Error('Site introuvable'), { status: 404 });

  const updated = await prisma.websites.update({
    where: { id: wid },
    data: {
      name: data.name,
      logo: data.logo,
      url: data.url,
      description: data.description,
      techStack: (data.techStack as any) ?? undefined,
      media: data.media,
      category: data.category,
    },
  });
  return toPublic(updated);
}

export async function deleteWebsite(userId: number, id: number) {
  const uid = BigInt(userId);
  const wid = BigInt(id);
  const del = await prisma.websites.deleteMany({ where: { id: wid, client: { ownerId: uid } } });
  if (del.count === 0) throw Object.assign(new Error('Site introuvable'), { status: 404 });
}

