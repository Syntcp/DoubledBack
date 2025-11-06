"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listClients = listClients;
exports.getClient = getClient;
exports.createClient = createClient;
exports.updateClient = updateClient;
exports.deleteClient = deleteClient;
const prisma_js_1 = require("../lib/prisma.js");
function toPublic(c) {
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
function ciContains(q) {
    const url = process.env.DATABASE_URL ?? '';
    const isPg = /^postgres(ql)?:/i.test(url);
    return isPg ? { contains: q, mode: 'insensitive' } : { contains: q };
}
async function listClients(userId, opts) {
    const uid = BigInt(userId);
    const { q, page, pageSize } = opts;
    const skip = (page - 1) * pageSize;
    const where = { ownerId: uid };
    if (q && q.length > 0) {
        where.OR = [
            { fullName: ciContains(q) },
            { email: ciContains(q) },
            { company: ciContains(q) },
        ];
    }
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.client.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
        prisma_js_1.prisma.client.count({ where }),
    ]);
    return { items: items.map(toPublic), total, page, pageSize };
}
async function getClient(userId, id) {
    const uid = BigInt(userId);
    const cid = BigInt(id);
    const c = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!c)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    return toPublic(c);
}
async function createClient(userId, data) {
    const uid = BigInt(userId);
    const c = await prisma_js_1.prisma.client.create({
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
async function updateClient(userId, id, data) {
    const uid = BigInt(userId);
    const cid = BigInt(id);
    const exists = await prisma_js_1.prisma.client.findFirst({ where: { id: cid, ownerId: uid } });
    if (!exists)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
    const updated = await prisma_js_1.prisma.client.update({
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
async function deleteClient(userId, id) {
    const uid = BigInt(userId);
    const cid = BigInt(id);
    const del = await prisma_js_1.prisma.client.deleteMany({ where: { id: cid, ownerId: uid } });
    if (del.count === 0)
        throw Object.assign(new Error('Client introuvable'), { status: 404 });
}
