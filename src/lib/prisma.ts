import { PrismaClient } from '@prisma/client';
import { logger } from './logger.js';

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
        return result;
      }
    }
  }
});

if (process.env.NODE_ENV !== 'production') global.__PRISMA_BASE__ = base;
