"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLogs = listLogs;
exports.getLog = getLog;
exports.listLogsByEntity = listLogsByEntity;
exports.listLogsByRequestId = listLogsByRequestId;
exports.listHttpLogs = listHttpLogs;
const prisma_js_1 = require("../lib/prisma.js");
function toPublic(row) {
    return {
        id: Number(row.id),
        actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
        entityType: row.entityType,
        entityId: row.entityId == null ? null : Number(row.entityId),
        action: row.action,
        ip: row.ip ?? null,
        userAgent: row.userAgent ?? null,
        metadata: row.metadata,
        createdAt: row.createdAt,
    };
}
async function listLogs(opts) {
    const { page, pageSize, entityType, action, actorUserId, from, to } = opts;
    const where = {};
    if (entityType)
        where.entityType = entityType;
    if (action)
        where.action = action;
    if (actorUserId)
        where.actorUserId = BigInt(actorUserId);
    if (from || to)
        where.createdAt = { gte: from, lte: to };
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.activityLog.findMany({ where, orderBy: { id: 'desc' }, skip, take: pageSize }),
        prisma_js_1.prisma.activityLog.count({ where }),
    ]);
    return { items: items.map(toPublic), total, page, pageSize };
}
async function getLog(id) {
    const l = await prisma_js_1.prisma.activityLog.findUnique({ where: { id: BigInt(id) } });
    if (!l)
        return null;
    return toPublic(l);
}
async function listLogsByEntity(entityType, entityId, opts) {
    const where = { entityType, entityId: BigInt(entityId) };
    const skip = (opts.page - 1) * opts.pageSize;
    const [items, total] = await Promise.all([
        prisma_js_1.prisma.activityLog.findMany({ where, orderBy: { id: 'desc' }, skip, take: opts.pageSize }),
        prisma_js_1.prisma.activityLog.count({ where }),
    ]);
    return { items: items.map(toPublic), total, page: opts.page, pageSize: opts.pageSize };
}
// MySQL JSON filters via raw SQL for requestId/method/url/statusCode on metadata
async function listLogsByRequestId(requestId, opts) {
    const offset = (opts.page - 1) * opts.pageSize;
    const rows = await prisma_js_1.prisma.$queryRaw `
    SELECT id, actorUserId, entityType, entityId, action, ip, userAgent, metadata, createdAt
    FROM ActivityLog
    WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ${requestId}
    ORDER BY id DESC
    LIMIT ${opts.pageSize} OFFSET ${offset}
  `;
    const countRows = await prisma_js_1.prisma.$queryRaw `
    SELECT COUNT(*) as c
    FROM ActivityLog
    WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ${requestId}
  `;
    const total = Number(countRows[0]?.c ?? 0);
    return { items: rows.map(toPublic), total, page: opts.page, pageSize: opts.pageSize };
}
async function listHttpLogs(opts) {
    const { page, pageSize, requestId, method, statusCode, url, from, to } = opts;
    const offset = (page - 1) * pageSize;
    // Build dynamic WHERE for raw SQL
    const conds = ["entityType = 'http_request'"];
    const params = [];
    if (requestId) {
        conds.push("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ?");
        params.push(requestId);
    }
    if (method) {
        conds.push("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.method')) = ?");
        params.push(method);
    }
    if (typeof statusCode === 'number') {
        conds.push("JSON_EXTRACT(metadata, '$.statusCode') = ?");
        params.push(statusCode);
    }
    if (url) {
        conds.push("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.url')) LIKE ?");
        params.push(`%${url}%`);
    }
    if (from) {
        conds.push('createdAt >= ?');
        params.push(from);
    }
    if (to) {
        conds.push('createdAt <= ?');
        params.push(to);
    }
    const whereSql = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const rows = await prisma_js_1.prisma.$queryRawUnsafe(`SELECT id, actorUserId, entityType, entityId, action, ip, userAgent, metadata, createdAt
     FROM ActivityLog
     ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`, ...params, pageSize, offset);
    const countRows = await prisma_js_1.prisma.$queryRawUnsafe(`SELECT COUNT(*) as c FROM ActivityLog ${whereSql}`, ...params);
    const total = Number(countRows[0]?.c ?? 0);
    return { items: rows.map(toPublic), total, page, pageSize };
}
