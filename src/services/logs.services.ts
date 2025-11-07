// @ts-nocheck
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type ActivityLogPublic = {
  id: number;
  actorUserId?: number | null;
  entityType: string;
  entityId?: number | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  method?: string | null;
  metadata: unknown;
  createdAt: Date;
};

function toPublic(row: any): ActivityLogPublic {
  return {
    id: Number(row.id),
    actorUserId: row.actorUserId == null ? null : Number(row.actorUserId),
    entityType: row.entityType,
    entityId: row.entityId == null ? null : Number(row.entityId),
    action: row.action,
    ip: row.ip ?? null,
    userAgent: row.userAgent ?? null,
    method: row.method ?? null,
    metadata: row.metadata,
    createdAt: row.createdAt,
  };
}

export async function listLogs(opts: {
  page: number;
  pageSize: number;
  entityType?: string;
  action?: string;
  actorUserId?: number;
  from?: Date;
  to?: Date;
}) {
  const { page, pageSize, entityType, action, actorUserId, from, to } = opts;
  const where: Prisma.ActivityLogWhereInput = {};
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;
  if (actorUserId) where.actorUserId = BigInt(actorUserId);
  if (from || to) where.createdAt = { gte: from, lte: to } as any;

  const skip = (page - 1) * pageSize;
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { id: 'desc' }, skip, take: pageSize }),
    prisma.activityLog.count({ where }),
  ]);
  return { items: items.map(toPublic), total, page, pageSize };
}

export async function getLog(id: number) {
  const l = await prisma.activityLog.findUnique({ where: { id: BigInt(id) } });
  if (!l) return null;
  return toPublic(l);
}

export async function listLogsByEntity(entityType: string, entityId: number, opts: { page: number; pageSize: number }) {
  const where: Prisma.ActivityLogWhereInput = { entityType, entityId: BigInt(entityId) } as any;
  const skip = (opts.page - 1) * opts.pageSize;
  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { id: 'desc' }, skip, take: opts.pageSize }),
    prisma.activityLog.count({ where }),
  ]);
  return { items: items.map(toPublic), total, page: opts.page, pageSize: opts.pageSize };
}

// MySQL JSON filters via raw SQL for requestId/method/url/statusCode on metadata
export async function listLogsByRequestId(requestId: string, opts: { page: number; pageSize: number }) {
  const offset = (opts.page - 1) * opts.pageSize;
  const rows = await prisma.$queryRaw<Array<any>>`
    SELECT id, actorUserId, entityType, entityId, action, ip, userAgent, method, metadata, createdAt
    FROM ActivityLog
    WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ${requestId}
    ORDER BY id DESC
    LIMIT ${opts.pageSize} OFFSET ${offset}
  `;
  const countRows = await prisma.$queryRaw<Array<{ c: bigint }>>`
    SELECT COUNT(*) as c
    FROM ActivityLog
    WHERE JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ${requestId}
  `;
  const total = Number(countRows[0]?.c ?? 0);
  return { items: rows.map(toPublic), total, page: opts.page, pageSize: opts.pageSize };
}

export async function listHttpLogs(opts: {
  page: number;
  pageSize: number;
  requestId?: string;
  method?: string;
  statusCode?: number;
  url?: string; // partial match
  from?: Date;
  to?: Date;
}) {
  const { page, pageSize, requestId, method, statusCode, url, from, to } = opts;
  const offset = (page - 1) * pageSize;

  // Build dynamic WHERE for raw SQL
  const conds: string[] = ["entityType = 'http_request'"];
  const params: any[] = [];
  if (requestId) {
    conds.push("JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.requestId')) = ?");
    params.push(requestId);
  }
  if (method) {
    conds.push("method = ?");
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

  const rows = await prisma.$queryRawUnsafe<Array<any>>(
    `SELECT id, actorUserId, entityType, entityId, action, ip, userAgent, method, metadata, createdAt
     FROM ActivityLog
     ${whereSql}
     ORDER BY id DESC
     LIMIT ? OFFSET ?`,
    ...params,
    pageSize,
    offset,
  );
  const countRows = await prisma.$queryRawUnsafe<Array<{ c: bigint }>>(
    `SELECT COUNT(*) as c FROM ActivityLog ${whereSql}`,
    ...params,
  );
  const total = Number(countRows[0]?.c ?? 0);
  return { items: rows.map(toPublic), total, page, pageSize };
}
