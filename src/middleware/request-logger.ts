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
  const url = (req as any).originalUrl || req.url;
  const ip = (req as any).ip || (req.socket && (req.socket as any).remoteAddress);
  const ua = req.headers['user-agent'];

  logger.info({ id, method: req.method, url, ip, userAgent: ua }, 'Incoming request');

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const ms = Number(end - start) / 1_000_000;
    const userId = (req as any).user?.id;
    const auth = (res as any).locals?.auth;
    const contentLength = res.getHeader('content-length');

    const base = {
      id,
      method: req.method,
      url,
      statusCode: res.statusCode,
      durationMs: Math.round(ms),
      userId,
      contentLength: typeof contentLength === 'string' ? Number(contentLength) : contentLength,
    } as Record<string, unknown>;

    if (auth) {
      base.auth = auth;
    }

    // Use warn level for 4xx/5xx to stand out.
    if (res.statusCode >= 400) {
      logger.warn(base, 'Request completed with error');
    } else {
      logger.info(base, 'Request completed');
    }
  });

  next();
}
