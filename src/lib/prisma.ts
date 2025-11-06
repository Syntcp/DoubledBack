import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';
import { getRequestContext } from './als.js';
import { emitToUser } from './sse.js';

declare global {
  // eslint-disable-next-line no-var
  var __PRISMA_BASE__: PrismaClient | undefined;
}

const base = global.__PRISMA_BASE__ ?? new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error']
});

export const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const start = Date.now();
        const result = await query(args);
        const dur = Date.now() - start;
        if (dur > 200) {
          logger.warn({ model, operation, dur }, 'Prisma slow op');
        }
        // Emit SSE event for write operations
        try {
          const writeOps = new Set([
            'create','createMany','update','updateMany','upsert','delete','deleteMany'
          ]);
          if (writeOps.has(operation) && model !== 'ActivityLog') {
            const ctx = getRequestContext();
            const userId = ctx?.userId;
            if (typeof userId === 'number') {
              const payload: Record<string, unknown> = {
                model,
                operation,
                requestId: ctx?.requestId,
                method: ctx?.method,
                url: ctx?.url,
              };
              // Try to include id(s) when obvious
              if (operation === 'create' && result && typeof (result as any).id !== 'undefined') {
                payload.id = Number((result as any).id);
              }
              if ((operation === 'update' || operation === 'delete' || operation === 'upsert') && args && (args as any).where && (args as any).where.id) {
                const idVal = (args as any).where.id as any;
                payload.id = typeof idVal === 'bigint' ? Number(idVal) : Number(idVal);
              }
              emitToUser(userId, 'db_change', payload);
            }
          }
        } catch {}
        return result;
      }
    }
  }
});

if (process.env.NODE_ENV !== 'production') global.__PRISMA_BASE__ = base;
