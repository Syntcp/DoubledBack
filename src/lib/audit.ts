import type { Request } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';

export type AuditContext = {
  requestId?: string;
  ip?: string | null;
  userAgent?: string | null;
  reason?: string | null;
};

export function buildAuditContext(req: Request): AuditContext {
  const id = (req as any).id as string | undefined;
  const ip = (req as any).ip || (req.socket && (req.socket as any).remoteAddress) || null;
  const userAgent = (req.headers['user-agent'] as string) || null;
  const reasonHdr = req.headers['x-audit-reason'];
  const reason = typeof reasonHdr === 'string' ? reasonHdr : null;
  return { requestId: id, ip, userAgent, reason };
}

export function redactSensitive<T = unknown>(value: T): T {
  try {
    if (value == null) return value;
    if (Array.isArray(value)) return value.map((v) => redactSensitive(v)) as unknown as T;
    if (typeof value === 'object') {
      const out: any = Array.isArray(value) ? [] : {};
      for (const [k, v] of Object.entries(value as any)) {
        const key = k.toLowerCase();
        if (
          key.includes('password') ||
          key.includes('token') ||
          key.includes('authorization') ||
          key.includes('cookie') ||
          key.includes('secret') ||
          key.includes('hash')
        ) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = redactSensitive(v);
        }
      }
      return out as T;
    }
    return value;
  } catch {
    return value;
  }
}

type ActivityOptions = {
  actorUserId?: number | bigint | null;
  entityType: string;
  entityId?: number | bigint | null;
  action: string;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

/**
 * Write an ActivityLog record. Accepts an optional transaction client.
 */
export async function auditLog(
  opts: ActivityOptions,
  tx?: Pick<Prisma.TransactionClient, 'activityLog'> | typeof prisma,
) {
  const client: any = tx ?? prisma;
  const actor = opts.actorUserId == null ? null : BigInt(opts.actorUserId);
  const eid = opts.entityId == null ? null : BigInt(opts.entityId as any);
  await client.activityLog.create({
    data: {
      actorUserId: actor,
      entityType: opts.entityType,
      entityId: eid,
      action: opts.action,
      ip: opts.ip ?? null,
      userAgent: opts.userAgent ?? null,
      metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

