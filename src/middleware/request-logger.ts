import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../lib/logger.js';

export function requestId(req: Request, res: Response, next: NextFunction) {
  const header = req.headers['x-request-id'];
  const id = typeof header === 'string' && header.length > 0 ? header : randomUUID();
  res.setHeader('x-request-id', id);
  (req as any).id = id;
  next();
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  const id = (req as any).id as string | undefined;
  logger.info({ id, method: req.method, url: (req as any).originalUrl || req.url }, 'Incoming request');

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    logger.info({ id, statusCode: res.statusCode, durationMs: Math.round(ms) }, 'Request completed');
  });

  next();
}

